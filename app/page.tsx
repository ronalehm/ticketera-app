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
      {/* -mt-8/-mt-10: solape flotante (MASTER §8); los puntos del hero (size-11) empiezan en bottom-10/12 (40/48px), por encima del solape. */}
      <div className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 md:-mt-10 md:px-6 lg:px-8">
        <EventSearchBar />
      </div>
      <CategoryGrid />
      <FeaturedEventsRail events={featuredEvents} />
      <UpcomingEvents events={events} />
      <OrganizerBanner />
      <TrustHighlights />
    </>
  );
}
