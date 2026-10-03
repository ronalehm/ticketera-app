import {
  CategoryGrid,
  EventSearchBar,
  FeaturedEventsRail,
  getEvents,
  getFeaturedEvents,
  HeroCarousel,
  UpcomingEvents,
} from "@/modules/events";
import { OrganizerBanner, TrustHighlights } from "@/modules/marketing";

export default async function HomePage() {
  const [events, featuredEvents] = await Promise.all([getEvents(), getFeaturedEvents()]);

  return (
    <>
      <HeroCarousel events={featuredEvents} />
      <EventSearchBar />
      <CategoryGrid />
      <FeaturedEventsRail events={featuredEvents} />
      <UpcomingEvents events={events} />
      <OrganizerBanner />
      <TrustHighlights />
    </>
  );
}
