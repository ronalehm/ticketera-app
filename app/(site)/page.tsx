import {
  CategoryGrid,
  EventSearchBar,
  FeaturedEventsRail,
  getEventMonths,
  getEvents,
  getFeaturedEvents,
  HeroCarousel,
  UpcomingEvents,
} from "@/modules/events";
import { HowItWorks, NewsletterSignup, OrganizerBanner, TrustHighlights } from "@/modules/marketing";

export default async function HomePage() {
  const [events, featuredEvents] = await Promise.all([getEvents(), getFeaturedEvents()]);

  return (
    <>
      <HeroCarousel events={featuredEvents} />
      <EventSearchBar months={getEventMonths(events)} />
      <CategoryGrid />
      <FeaturedEventsRail events={featuredEvents} />
      <UpcomingEvents events={events} />
      <HowItWorks />
      <OrganizerBanner />
      <TrustHighlights />
      <NewsletterSignup />
    </>
  );
}
