import dayjs from "dayjs";
import { mockUsers } from "@/mock/users";
import { MockUser } from "@/types/types";

export type Match = MockUser & {
  likedAt: Date;
  matched: boolean;
};

export type MatchSection = {
  title: string;
  data: Match[][];
};

const PER_DAY = 4;
const DAYS_PER_PAGE = Math.ceil(mockUsers.length / PER_DAY);

export function buildMatches(page: number): Match[] {
  const baseDay = page * DAYS_PER_PAGE;
  return mockUsers.map((user, i) => ({
    ...user,
    id: `${user.id}-p${page}`,
    matched: i % 3 === 2,
    likedAt: dayjs()
      .subtract(baseDay + Math.floor(i / PER_DAY), "day")
      .toDate(),
  }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function dayLabel(date: Date): string {
  const day = dayjs(date).startOf("day");
  const diff = dayjs().startOf("day").diff(day, "day");
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.format("D MMM YYYY");
}

function groupByDay(matches: Match[]): MatchSection[] {
  const order: string[] = [];
  const buckets: Record<string, Match[]> = {};

  for (const match of matches) {
    const label = dayLabel(match.likedAt);
    if (!buckets[label]) {
      buckets[label] = [];
      order.push(label);
    }
    buckets[label].push(match);
  }

  return order.map((title) => ({ title, data: chunk(buckets[title], 2) }));
}

export type MatchListItem =
  | { kind: "section"; title: string }
  | { kind: "date"; title: string }
  | { kind: "row"; row: Match[] };

export function buildMatchList(matches: Match[]): MatchListItem[] {
  const likedBack = matches.filter((match) => match.matched);
  const pending = matches.filter((match) => !match.matched);

  const items: MatchListItem[] = [];

  if (likedBack.length) {
    items.push({ kind: "section", title: "People who liked you back" });
    for (const row of chunk(likedBack, 2)) items.push({ kind: "row", row });
  }

  if (pending.length) {
    items.push({ kind: "section", title: "People who liked you" });
    for (const group of groupByDay(pending)) {
      items.push({ kind: "date", title: group.title });
      for (const row of group.data) items.push({ kind: "row", row });
    }
  }

  return items;
}
