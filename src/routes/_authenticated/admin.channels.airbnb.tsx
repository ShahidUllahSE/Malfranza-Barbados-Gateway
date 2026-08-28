import { createFileRoute } from "@tanstack/react-router";
import { Beds24ChannelPage } from "@/components/admin/Beds24ChannelPage";

export const Route = createFileRoute("/_authenticated/admin/channels/airbnb")({
  component: () => <Beds24ChannelPage channelId="airbnb" />,
});
