import { fetchHandAction } from "@/app/actions";
import ReplayClient from "./ReplayClient";
import { notFound } from "next/navigation";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hand = await fetchHandAction(id);

  if (!hand) {
    notFound();
  }

  return <ReplayClient hand={hand} />;
}
