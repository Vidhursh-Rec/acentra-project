// Doctor Screen 4 — own calendar: follow-up appointments of approved patients.
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Calendar } from "react-native-calendars";

import { AppText, Card, Notice, Screen, SectionHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors } from "@/lib/theme";

type Event = { task_id: string; date: string; patient_id: string; patient_name: string; with: string | null; specialty: string | null };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DoctorCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState(today());
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<Event[]>("/doctor/calendar")
        .then((e) => { setEvents(e); setError(null); })
        .catch(() => setError("Could not load the calendar."));
    }, []),
  );

  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    for (const e of events) m[e.date] = { marked: true, dotColor: colors.brand };
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: colors.brand };
    return m;
  }, [events, selected]);

  const dayEvents = events.filter((e) => e.date === selected);
  const upcoming = events.filter((e) => e.date >= today());

  return (
    <Screen header={<View className="border-b border-line px-5 py-3"><AppText weight="bold" className="text-xl">Calendar</AppText></View>}>
      <ScrollView contentContainerClassName="p-5">
        {error ? <Notice tone="red">{error}</Notice> : null}
        <View className="overflow-hidden rounded-xl border border-line">
          <Calendar
            current={selected}
            markedDates={marked}
            onDayPress={(d) => setSelected(d.dateString)}
            theme={{
              todayTextColor: colors.brand,
              arrowColor: colors.ink,
              selectedDayBackgroundColor: colors.brand,
              textDayFontFamily: "Inter_400Regular",
              textMonthFontFamily: "Inter_600SemiBold",
              textDayHeaderFontFamily: "Inter_600SemiBold",
            }}
          />
        </View>

        <SectionHeader>{formatDate(selected)}</SectionHeader>
        {dayEvents.length === 0 ? <AppText className="text-muted">No appointments.</AppText> : null}
        {dayEvents.map((e) => (
          <Card key={e.task_id} className="mb-3">
            <AppText weight="semibold">{e.patient_name} · {e.patient_id}</AppText>
            <AppText className="mt-1 text-sm text-muted">{e.with ?? e.specialty ?? "Follow-up"}</AppText>
          </Card>
        ))}

        <SectionHeader>Upcoming</SectionHeader>
        {upcoming.length === 0 ? <AppText className="text-muted">Nothing scheduled.</AppText> : null}
        {upcoming.map((e) => (
          <View key={e.task_id} className="flex-row justify-between border-b border-line py-3">
            <AppText className="flex-1">{e.patient_name}</AppText>
            <AppText className="text-muted">{formatDate(e.date)}</AppText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
