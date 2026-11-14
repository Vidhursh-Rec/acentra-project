"""
engine/graph.py — NetworkX heterogeneous transaction graph wrapper.

Node types  : txn, user, device, pmt, addr
Edge types  : MADE, USED_DEVICE, USED_TOKEN, SHIPPED_TO, HAS_FLAG
"""
import threading
from typing import Any, Dict, List, Optional, Set

import networkx as nx


class FraudGraph:
    """
    Thread-safe in-memory heterogeneous graph built from transactions.
    Rebuilt from PostgreSQL on startup; updated incrementally per ingestion.
    """

    def __init__(self):
        self._graph: nx.MultiDiGraph = nx.MultiDiGraph()
        self._lock = threading.Lock()

    # ── Mutation ──────────────────────────────────────────────────────────────

    def add_transaction(self, txn: dict, is_flagged: bool = False) -> None:
        """Inserts a transaction and all its entity nodes/edges into the graph."""
        tid = f"txn:{txn['txn_id']}"
        uid = f"user:{txn['user_id']}"

        with self._lock:
            # Node: transaction
            self._graph.add_node(tid, type="txn", flagged=is_flagged, **{
                k: txn.get(k) for k in ("amount", "city", "timestamp")
            })

            # Node: user
            if not self._graph.has_node(uid):
                self._graph.add_node(uid, type="user")
            self._graph.add_edge(uid, tid, rel="MADE")

            # Node: device
            if txn.get("device_id"):
                did = f"device:{txn['device_id']}"
                if not self._graph.has_node(did):
                    self._graph.add_node(did, type="device")
                self._graph.add_edge(tid, did, rel="USED_DEVICE")

            # Node: payment token
            if txn.get("payment_token"):
                pid = f"pmt:{txn['payment_token']}"
                if not self._graph.has_node(pid):
                    self._graph.add_node(pid, type="pmt")
                self._graph.add_edge(tid, pid, rel="USED_TOKEN")

            # Node: shipping address
            if txn.get("shipping_address"):
                aid = f"addr:{txn['shipping_address']}"
                if not self._graph.has_node(aid):
                    self._graph.add_node(aid, type="addr")
                self._graph.add_edge(tid, aid, rel="SHIPPED_TO")

    def mark_flagged(self, txn_id: str) -> None:
        """Marks a transaction node as flagged (fraudulent)."""
        tid = f"txn:{txn_id}"
        with self._lock:
            if self._graph.has_node(tid):
                self._graph.nodes[tid]["flagged"] = True

    # ── Query ─────────────────────────────────────────────────────────────────

    def shared_entity_risk(self, txn: dict, min_shared_users: int = 3) -> Dict[str, Any]:
        """
        Returns a dict with:
          - shared_device_users: list of user IDs sharing the same device_id
          - shared_addr_users: list of user IDs sharing the same shipping_address
          - connected_to_fraud: bool — any neighbour flagged=True
          - score_contribution: int
        """
        result: Dict[str, Any] = {
            "shared_device_users": [],
            "shared_addr_users": [],
            "connected_to_fraud": False,
            "score_contribution": 0,
        }

        with self._lock:
            # Device sharing
            if txn.get("device_id"):
                did = f"device:{txn['device_id']}"
                if self._graph.has_node(did):
                    users_via_device = self._users_via_entity(did)
                    result["shared_device_users"] = list(users_via_device)
                    if len(users_via_device) >= min_shared_users:
                        result["score_contribution"] += 20

            # Address sharing
            if txn.get("shipping_address"):
                aid = f"addr:{txn['shipping_address']}"
                if self._graph.has_node(aid):
                    users_via_addr = self._users_via_entity(aid)
                    result["shared_addr_users"] = list(users_via_addr)
                    if len(users_via_addr) >= min_shared_users:
                        result["score_contribution"] = max(result["score_contribution"], 20)

            # Connected-to-fraud check
            tid = f"txn:{txn.get('txn_id', '')}"
            if self._graph.has_node(tid):
                for neighbour in nx.neighbors(self._graph, tid):
                    if self._graph.nodes[neighbour].get("flagged"):
                        result["connected_to_fraud"] = True
                        result["score_contribution"] = max(result["score_contribution"], 15)
                        break

        return result

    def get_neighborhood_json(self, txn_id: str, depth: int = 2) -> Dict[str, Any]:
        """
        Returns a force-graph-compatible JSON dict:
          { nodes: [{id, label, type, flagged}], links: [{source, target, rel}] }
        """
        tid = f"txn:{txn_id}"
        with self._lock:
            if not self._graph.has_node(tid):
                return {"nodes": [], "links": []}

            subgraph_nodes: Set[str] = {tid}
            frontier = {tid}
            for _ in range(depth):
                next_frontier: Set[str] = set()
                for n in frontier:
                    next_frontier.update(nx.neighbors(self._graph, n))
                    next_frontier.update(self._graph.predecessors(n))
                subgraph_nodes |= next_frontier
                frontier = next_frontier

            nodes = []
            for n in subgraph_nodes:
                data = self._graph.nodes[n]
                nodes.append({
                    "id": n,
                    "label": n.split(":", 1)[-1],
                    "type": data.get("type", "unknown"),
                    "flagged": data.get("flagged", False),
                })

            links = []
            seen_edges: Set[tuple] = set()
            for u, v, data in self._graph.edges(data=True):
                if u in subgraph_nodes and v in subgraph_nodes:
                    key = (u, v)
                    if key not in seen_edges:
                        seen_edges.add(key)
                        links.append({"source": u, "target": v, "rel": data.get("rel", "")})

            return {"nodes": nodes, "links": links}

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _users_via_entity(self, entity_node: str) -> Set[str]:
        """Returns the set of user IDs connected through the given entity node."""
        user_ids: Set[str] = set()
        # Find all txn nodes connected to this entity
        for txn_node in self._graph.predecessors(entity_node):
            if not txn_node.startswith("txn:"):
                continue
            # Find all user nodes connected to this txn
            for user_node in self._graph.predecessors(txn_node):
                if user_node.startswith("user:"):
                    user_ids.add(user_node.removeprefix("user:"))
        return user_ids

    @property
    def node_count(self) -> int:
        return self._graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self._graph.number_of_edges()


# Singleton instance shared across all requests
fraud_graph = FraudGraph()
