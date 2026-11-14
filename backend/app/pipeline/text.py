import re

_DASHES = re.compile(r"[‐-―−]")
_SPACES = re.compile(r"\s+")


def norm(s: str) -> str:
    """Normalise for 'does this quote exist in the source' checks."""
    s = _DASHES.sub("-", s)
    s = s.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"')
    return _SPACES.sub(" ", s).strip().casefold()


def name_key(name: str) -> str:
    """'Murugan  Selvam.' -> 'murugan selvam' for comparing person names."""
    return " ".join(re.sub(r"[^\w\s]", " ", name.casefold()).split())
