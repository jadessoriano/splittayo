import TripApp from "@/components/TripApp";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripApp tripId={id} />;
}
