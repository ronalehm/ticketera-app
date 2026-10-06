import {
  CategoryGrid,
  EventSearchBar,
  FeaturedEventsRail,
  getEventMonths,
  getFeaturedEvents,
  getUpcomingEvents,
  HeroCarousel,
  listEventCategories,
  UpcomingEvents,
} from "@/modules/events";
import { HowItWorks, NewsletterSignup, OrganizerBanner, TrustHighlights } from "@/modules/marketing";

// ISR: «ahora» para Hero y Próximos se recalcula como mucho cada 15 min (destacar/editar ya revalidan "/" al momento).
export const revalidate = 900;

export default async function HomePage() {
  const [categories, events, featuredEvents] = await Promise.all([
    listEventCategories(),
    getUpcomingEvents(),
    getFeaturedEvents(),
  ]);

  return (
    <>
      <HeroCarousel events={featuredEvents} />
      <EventSearchBar months={getEventMonths(events)} />
      <CategoryGrid categories={categories} />
      <FeaturedEventsRail events={featuredEvents} />
      <UpcomingEvents events={events} categories={categories} />
      <HowItWorks />
      <OrganizerBanner />
      <TrustHighlights />
      <NewsletterSignup />
    </>
  );
}
