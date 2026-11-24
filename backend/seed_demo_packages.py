"""One-off seed: 10 professional published tour packages (no media)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model

from packages.models import TourPackage
from packages.services import PackageService
from packages.validators import min_bookable_date, today_in_business_tz

PACKAGES = [
    {
        "title": "Cox's Bazar Coastal Retreat",
        "short_description": (
            "Three calm days along the world's longest natural sea beach, "
            "with sunrise walks and fresh coastal air."
        ),
        "full_description": (
            "Unwind on Bangladesh's signature shoreline. Stay near Laboni Beach, "
            "stroll the Marine Drive at golden hour, and take an optional Inani Beach "
            "excursion. Designed for couples and families who want coastal calm "
            "without a rushed itinerary."
        ),
        "destinations": "Cox's Bazar, Inani Beach",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Dhaka",
        "base_price": Decimal("18500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Boutique hotel stay\n"
            "Daily breakfast\n"
            "Airport / bus station transfers in Cox's Bazar\n"
            "Guided Marine Drive sunset walk\n"
            "Local host assistance"
        ),
        "excluded_services": (
            "Flights or intercity coach tickets\n"
            "Lunches and dinners\n"
            "Personal expenses and tips\n"
            "Optional water sports"
        ),
        "itinerary": (
            "Day 1 — Arrive Cox's Bazar, check-in, evening beach walk.\n"
            "Day 2 — Sunrise on the shore, Inani Beach half-day, free afternoon.\n"
            "Day 3 — Leisure morning, checkout, return to Dhaka."
        ),
        "cancellation_policy": (
            "Full refund if cancelled 14 or more days before departure. "
            "50% refund between 7 and 13 days. Non-refundable within 6 days."
        ),
        "additional_info": (
            "Modest beachwear recommended. Pack sunscreen, a light jacket for "
            "evenings, and comfortable walking shoes."
        ),
        "feature": True,
        "date_offsets": [14, 28, 45],
    },
    {
        "title": "Sundarbans Mangrove Expedition",
        "short_description": (
            "A guided wildlife voyage through UNESCO mangrove forests "
            "with overnight boat stays."
        ),
        "full_description": (
            "Cruise the channels of the Sundarbans with an experienced naturalist "
            "crew. Spot spotted deer, monitor lizards, and — with luck — the elusive "
            "Bengal tiger from a safe distance. Evenings aboard are quiet, lantern-lit, "
            "and focused on conservation storytelling."
        ),
        "destinations": "Sundarbans, Mongla",
        "duration_days": 4,
        "duration_nights": 3,
        "starting_location": "Khulna",
        "base_price": Decimal("32000.00"),
        "currency": "BDT",
        "difficulty": "Moderate",
        "included_services": (
            "Shared cabin on a licensed tour vessel\n"
            "All meals on board\n"
            "Forest entry permits\n"
            "Naturalist guide\n"
            "Safety briefing and life jackets"
        ),
        "excluded_services": (
            "Travel to Khulna embarkation point\n"
            "Personal insurance\n"
            "Soft drinks and alcohol\n"
            "Tips for crew"
        ),
        "itinerary": (
            "Day 1 — Embark at Mongla, creek cruise, overnight on board.\n"
            "Day 2 — Dawn wildlife watch, Kotka / Kochikhali trails.\n"
            "Day 3 — Hiron Point viewpoint, village edge visit.\n"
            "Day 4 — Return cruise and disembark Khulna."
        ),
        "cancellation_policy": (
            "Full refund 21+ days before departure. 40% refund 10–20 days. "
            "Non-refundable within 9 days due to permit commitments."
        ),
        "additional_info": (
            "Motion-sickness medication advised. Insect repellent essential. "
            "Photography drones are not permitted."
        ),
        "feature": True,
        "date_offsets": [21, 35, 56],
    },
    {
        "title": "Sylhet Tea Garden Escape",
        "short_description": (
            "Rolling green estates, waterfall day trips, and quiet evenings "
            "in a hillside lodge."
        ),
        "full_description": (
            "Discover Sylhet's tea country at an unhurried pace. Walk estate paths "
            "at Srimangal, visit a tasting room, and day-trip to nearby waterfalls "
            "and Lawachara's evergreen canopy. Ideal for travelers seeking cool air "
            "and soft adventure."
        ),
        "destinations": "Srimangal, Sylhet, Lawachara",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Dhaka",
        "base_price": Decimal("16500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Hillside lodge accommodation\n"
            "Daily breakfast\n"
            "Private vehicle for listed excursions\n"
            "Tea estate tasting session\n"
            "Local English/Bangla-speaking guide"
        ),
        "excluded_services": (
            "Train or flight tickets to Sylhet\n"
            "Lunches and dinners\n"
            "National park entry fees beyond listed visits\n"
            "Personal shopping"
        ),
        "itinerary": (
            "Day 1 — Transfer to Srimangal, evening tea garden stroll.\n"
            "Day 2 — Lawachara morning walk, Madhabpur Lake, free evening.\n"
            "Day 3 — Waterfall visit (seasonal), return journey."
        ),
        "cancellation_policy": (
            "Full refund 10+ days before departure. 50% within 5–9 days. "
            "Non-refundable inside 4 days."
        ),
        "additional_info": (
            "Light rain is common — pack a compact umbrella. Leeches may appear "
            "after heavy rain on forest trails."
        ),
        "feature": True,
        "date_offsets": [12, 26, 40],
    },
    {
        "title": "Bandarban Hill Trails",
        "short_description": (
            "Misty ridges, tribal village hospitality, and panoramic viewpoints "
            "in the Chittagong Hill Tracts."
        ),
        "full_description": (
            "A carefully paced hill journey through Bandarban's ridgelines. Visit "
            "Nilgiri and Chimbuk viewpoints, meet local communities with respectful "
            "guided exchanges, and enjoy simple lodge stays with mountain air. "
            "Suitable for fit beginners comfortable with uneven paths."
        ),
        "destinations": "Bandarban, Nilgiri, Chimbuk",
        "duration_days": 4,
        "duration_nights": 3,
        "starting_location": "Chattogram",
        "base_price": Decimal("24500.00"),
        "currency": "BDT",
        "difficulty": "Moderate",
        "included_services": (
            "Lodge / guest-house stays\n"
            "Breakfast and dinner\n"
            "4x4 transfers on hill roads\n"
            "Licensed local guide\n"
            "Viewpoint entry arrangements"
        ),
        "excluded_services": (
            "Travel to Chattogram start point\n"
            "Lunches\n"
            "Personal trekking gear\n"
            "Tips and souvenirs"
        ),
        "itinerary": (
            "Day 1 — Arrive Bandarban, Chimbuk sunset.\n"
            "Day 2 — Nilgiri day, short ridge walk.\n"
            "Day 3 — Village visit and craft stop, leisure evening.\n"
            "Day 4 — Morning viewpoint, return to Chattogram."
        ),
        "cancellation_policy": (
            "Full refund 14+ days out. 50% between 7–13 days. "
            "Non-refundable within 6 days (vehicle and permit holds)."
        ),
        "additional_info": (
            "Valid photo ID required for hill-tract checkpoints. "
            "Avoid flying drones without permission."
        ),
        "feature": False,
        "date_offsets": [18, 32, 50],
    },
    {
        "title": "Saint Martin's Island Getaway",
        "short_description": (
            "Coral shores, turquoise shallows, and two nights on "
            "Bangladesh's only coral island."
        ),
        "full_description": (
            "Ferry to Saint Martin's for a bright, seaside reset. Snorkel calm "
            "lagoons (seasonal), watch fishing boats return at dusk, and sleep to "
            "the sound of waves. A compact escape for travelers who want island "
            "time without an international flight."
        ),
        "destinations": "Saint Martin's Island, Teknaf",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Teknaf",
        "base_price": Decimal("21000.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Round-trip ferry tickets (shared)\n"
            "Island guest-house stay\n"
            "Daily breakfast\n"
            "Beach orientation walk\n"
            "On-island host support"
        ),
        "excluded_services": (
            "Travel to Teknaf\n"
            "Lunches and dinners\n"
            "Snorkel gear rental\n"
            "Private boat charters"
        ),
        "itinerary": (
            "Day 1 — Teknaf ferry, check-in, sunset beach.\n"
            "Day 2 — Morning lagoon swim / snorkel (weather permitting), island loop walk.\n"
            "Day 3 — Leisure morning, return ferry."
        ),
        "cancellation_policy": (
            "Full refund 12+ days before. 40% within 6–11 days. "
            "Ferry rules may override within 5 days."
        ),
        "additional_info": (
            "Trips are weather-dependent; rough seas may delay ferries. "
            "Plastic waste reduction is encouraged on the island."
        ),
        "feature": False,
        "date_offsets": [16, 30, 48],
    },
    {
        "title": "Sajek Valley Cloud Camp",
        "short_description": (
            "Sleep above the clouds in Rangamati's highland valley with "
            "sunrise terraces and quiet trails."
        ),
        "full_description": (
            "Journey into Sajek for misty mornings, bamboo cottages, and sweeping "
            "views over Ruilui and Konglak. Evenings are for campfires (seasonal) "
            "and slow conversations under clear highland skies. Built for "
            "photographers and couples seeking altitude calm."
        ),
        "destinations": "Sajek Valley, Rangamati",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Khagrachhari",
        "base_price": Decimal("19500.00"),
        "currency": "BDT",
        "difficulty": "Moderate",
        "included_services": (
            "Cottage / camp stay\n"
            "Breakfast and dinner\n"
            "Jeep transfers on valley roads\n"
            "Local guide\n"
            "Sunrise viewpoint access"
        ),
        "excluded_services": (
            "Travel to Khagrachhari\n"
            "Lunches\n"
            "Personal photography equipment\n"
            "Tips"
        ),
        "itinerary": (
            "Day 1 — Jeep ascent, check-in, sunset terrace.\n"
            "Day 2 — Sunrise shoot, Konglak walk, free afternoon.\n"
            "Day 3 — Morning photos, descend to Khagrachhari."
        ),
        "cancellation_policy": (
            "Full refund 14+ days before departure. 50% within 7–13 days. "
            "Non-refundable inside 6 days."
        ),
        "additional_info": (
            "Nights can be cool — bring a fleece. Road conditions vary with rain; "
            "schedules may flex for safety."
        ),
        "feature": False,
        "date_offsets": [20, 34, 52],
    },
    {
        "title": "Old Dhaka Heritage Walk",
        "short_description": (
            "A half-day immersion into Mughal lanes, riverfront life, "
            "and legendary street flavours."
        ),
        "full_description": (
            "Explore Old Dhaka with a historian-minded local guide. Visit landmark "
            "mosques and riverside alleys, sample classic snacks, and learn how the "
            "city's mercantile past still shapes its streets. Perfect as a stand-alone "
            "city day or a prelude to longer Bangladesh travel."
        ),
        "destinations": "Old Dhaka, Buriganga",
        "duration_days": 1,
        "duration_nights": 0,
        "starting_location": "Dhaka",
        "base_price": Decimal("4500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Expert walking guide\n"
            "Tasting stops (selected snacks)\n"
            "Bottled water\n"
            "Entry arrangements for listed sites"
        ),
        "excluded_services": (
            "Hotel pickup outside central Dhaka\n"
            "Full meals\n"
            "Personal shopping\n"
            "Tips"
        ),
        "itinerary": (
            "Morning — Meet at starting landmark, heritage circuit with tasting pauses.\n"
            "Midday — Buriganga riverside wrap-up and farewell."
        ),
        "cancellation_policy": (
            "Full refund 48+ hours before start. Non-refundable within 48 hours."
        ),
        "additional_info": (
            "Wear modest clothing for religious sites. Expect busy streets and "
            "uneven pavements."
        ),
        "feature": False,
        "date_offsets": [10, 17, 24, 38],
    },
    {
        "title": "Kuakata Sea & Horizon",
        "short_description": (
            "Rare east-and-west ocean sunsets on the southern coast, "
            "with mangrove fringes nearby."
        ),
        "full_description": (
            "Kuakata offers a quieter coastal alternative to Cox's Bazar — long "
            "beaches, fishing communities, and views where sunrise and sunset both "
            "meet the sea. Pair beach time with a short trip toward nearby mangrove "
            "edges for a balanced short break."
        ),
        "destinations": "Kuakata, Patuakhali",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Dhaka",
        "base_price": Decimal("15500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Seaside hotel stay\n"
            "Daily breakfast\n"
            "Local transfers for listed sights\n"
            "Sunset beach walk with host\n"
            "Travel desk support"
        ),
        "excluded_services": (
            "Intercity transport to Kuakata\n"
            "Lunches and dinners\n"
            "Boat hire beyond itinerary\n"
            "Personal expenses"
        ),
        "itinerary": (
            "Day 1 — Arrive, beach orientation, sunset.\n"
            "Day 2 — Sunrise, Gangamati / mangrove fringe visit, free afternoon.\n"
            "Day 3 — Morning leisure, return."
        ),
        "cancellation_policy": (
            "Full refund 10+ days before. 50% within 5–9 days. "
            "Non-refundable inside 4 days."
        ),
        "additional_info": (
            "Facilities are simpler than major beach resorts — expect a peaceful, "
            "local atmosphere."
        ),
        "feature": False,
        "date_offsets": [15, 29, 43],
    },
    {
        "title": "Rangamati Lake Circuit",
        "short_description": (
            "Boat days on Kaptai Lake, hillside temples, and calm resorts "
            "above the water."
        ),
        "full_description": (
            "Glide across Kaptai Lake between forested shores and island landing "
            "points. Combine resort downtime with a guided boat circuit and cultural "
            "stops around Rangamati. A restorative itinerary for friends and families "
            "who prefer scenery over strenuous hikes."
        ),
        "destinations": "Rangamati, Kaptai Lake",
        "duration_days": 3,
        "duration_nights": 2,
        "starting_location": "Chattogram",
        "base_price": Decimal("17500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Lakeside resort stay\n"
            "Daily breakfast\n"
            "Shared boat excursion\n"
            "Local guide\n"
            "Listed viewpoint visits"
        ),
        "excluded_services": (
            "Travel to Rangamati\n"
            "Lunches and dinners\n"
            "Private boat upgrades\n"
            "Tips"
        ),
        "itinerary": (
            "Day 1 — Arrive Rangamati, resort check-in, lakeside evening.\n"
            "Day 2 — Full Kaptai Lake boat circuit with landings.\n"
            "Day 3 — Temple / craft stop, return toward Chattogram."
        ),
        "cancellation_policy": (
            "Full refund 12+ days before departure. 50% within 6–11 days. "
            "Non-refundable inside 5 days."
        ),
        "additional_info": (
            "Life jackets provided on boats. Bring sun protection for open-water hours."
        ),
        "feature": False,
        "date_offsets": [13, 27, 41],
    },
    {
        "title": "Paharpur & Bogura Heritage Trail",
        "short_description": (
            "Explore the ancient Somapura Mahavihara ruins and "
            "northern Bengal's cultural landscape."
        ),
        "full_description": (
            "A thoughtful heritage journey centered on UNESCO-listed Paharpur. Walk "
            "the monastery terraces with a knowledgeable guide, visit nearby museums, "
            "and sample Bogura's regional cuisine. Designed for culture-focused "
            "travelers who appreciate archaeology with comfortable pacing."
        ),
        "destinations": "Paharpur, Bogura",
        "duration_days": 2,
        "duration_nights": 1,
        "starting_location": "Dhaka",
        "base_price": Decimal("12500.00"),
        "currency": "BDT",
        "difficulty": "Easy",
        "included_services": (
            "Hotel stay in Bogura\n"
            "Breakfast\n"
            "Private vehicle for site visits\n"
            "Heritage guide at Paharpur\n"
            "Museum entry (listed)"
        ),
        "excluded_services": (
            "Optional train upgrades\n"
            "Lunches and dinners\n"
            "Personal purchases\n"
            "Tips"
        ),
        "itinerary": (
            "Day 1 — Travel to Bogura, afternoon museum / town orientation.\n"
            "Day 2 — Full morning at Paharpur ruins, return to Dhaka."
        ),
        "cancellation_policy": (
            "Full refund 7+ days before departure. 50% within 3–6 days. "
            "Non-refundable inside 2 days."
        ),
        "additional_info": (
            "Wear comfortable shoes for brick terraces. Midday sun can be strong — "
            "hats recommended."
        ),
        "feature": False,
        "date_offsets": [11, 25, 39],
    },
]


def run() -> None:
    User = get_user_model()
    admin = User.objects.filter(role="ADMIN").order_by("date_joined").first()
    if admin is None:
        raise SystemExit("No admin user found. Set ADMIN_EMAIL / ADMIN_PASSWORD and restart.")

    svc = PackageService()
    actor_id = admin.id
    as_of = today_in_business_tz()
    base = min_bookable_date(as_of=as_of)

    created = 0
    skipped = 0
    for spec in PACKAGES:
        title = spec["title"]
        existing = TourPackage.objects.filter(title=title).first()
        if existing is not None:
            print(f"SKIP     {title} ({existing.id})")
            skipped += 1
            continue

        data = {k: v for k, v in spec.items() if k not in ("feature", "date_offsets")}
        pkg = svc.create_draft(actor_id=actor_id, data=data)
        pkg = svc.publish(actor_id=actor_id, package=pkg)
        if spec.get("feature"):
            pkg = svc.feature(actor_id=actor_id, package=pkg)
        for off in spec["date_offsets"]:
            svc.create_available_date(
                actor_id=actor_id,
                package=pkg,
                tour_date=base + timedelta(days=off),
            )
        print(f"CREATED  {title} ({pkg.id}) featured={pkg.is_featured}")
        created += 1

    print(f"Done. created={created} skipped={skipped} total={len(PACKAGES)}")


if __name__ == "__main__":
    import django

    django.setup()
    run()
