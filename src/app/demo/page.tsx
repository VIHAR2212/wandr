import Link from "next/link";

export default function DemoTripPage() {
  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-orange-500">Wandr</Link>
        <Link
          href="/auth/login"
          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-sm font-medium transition"
        >
          Sign In to Create Your Trip
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium mb-3">
            EXAMPLE TRIP
          </div>
          <h1 className="text-3xl font-bold">Mumbai → Goa</h1>
          <p className="text-white/50 mt-1">7 days · 1 traveler · ₹1,00,000 budget</p>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"].map((day, i) => (
            <button
              key={day}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                i === 0
                  ? "bg-orange-600 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Day 1 Itinerary */}
        <div className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-orange-400">Beach & Nightlife Introduction</h2>

          {[
            { time: "06:00", title: "Flight: Mumbai → Goa", desc: "Take early morning flight from BOM to GOI. Approx 1 hour.", cost: "₹4,500", type: "transport" },
            { time: "08:30", title: "Check-in at Fortkochi Heritage", desc: "Comfort hotel in Panjim, close to all attractions. Freshen up and relax.", cost: "₹3,500", type: "accommodation" },
            { time: "10:30", title: "Breakfast at Cafe Tato", desc: "Try Goan poee bread with butter and chai. A local favorite since 1915.", cost: "₹200", type: "restaurant" },
            { time: "12:00", title: "Explore Old Goa Churches", desc: "Visit Basilica of Bom Jesus and Se Cathedral. UNESCO World Heritage Sites.", cost: "₹0", type: "sightseeing" },
            { time: "14:30", title: "Lunch at Viva Panjim", desc: "Authentic Goan fish curry rice and sorpotel. Vegetarian options available.", cost: "₹600", type: "restaurant" },
            { time: "16:00", title: "Panjim Market Walk", desc: "Explore the Latin Quarter of Fontainhas, colorful Portuguese-style houses.", cost: "₹0", type: "sightseeing" },
            { time: "18:30", title: "Sunset at Dona Paula", desc: "Beautiful viewpoint where the Mandovi river meets the Arabian Sea.", cost: "₹0", type: "sightseeing" },
            { time: "20:00", title: "Dinner at Thalassa", desc: "Greek-Goan fusion restaurant with stunning sunset views. Try the mezze platter.", cost: "₹1,500", type: "restaurant" },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition">
              <div className="text-orange-400 font-mono text-sm w-14 shrink-0 pt-0.5">{item.time}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{item.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.type === "restaurant" ? "bg-green-500/10 text-green-400" :
                    item.type === "transport" ? "bg-blue-500/10 text-blue-400" :
                    item.type === "accommodation" ? "bg-purple-500/10 text-purple-400" :
                    "bg-orange-500/10 text-orange-400"
                  }`}>{item.type}</span>
                </div>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
              <div className="text-white/70 text-sm font-medium shrink-0">{item.cost}</div>
            </div>
          ))}
        </div>

        {/* Budget Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="p-6 rounded-xl bg-white/5 border border-white/5">
            <h3 className="font-semibold mb-4">Budget Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Accommodation", value: "₹24,500", pct: 24.5 },
                { label: "Food & Dining", value: "₹18,000", pct: 18 },
                { label: "Transport", value: "₹12,000", pct: 12 },
                { label: "Activities", value: "₹8,000", pct: 8 },
                { label: "Miscellaneous", value: "₹5,000", pct: 5 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-orange-400">₹67,500</span>
              </div>
              <p className="text-green-400 text-xs mt-1">₹32,500 under budget!</p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white/5 border border-white/5">
            <h3 className="font-semibold mb-4">Recommended Hotels</h3>
            <div className="space-y-4">
              {[
                { name: "Fortkochi Heritage", area: "Panjim", price: "₹3,500/night", rating: 4.5 },
                { name: "Palolem Beach Resort", area: "South Goa", price: "₹2,800/night", rating: 4.3 },
              ].map((hotel) => (
                <div key={hotel.name} className="p-3 rounded-lg bg-white/5">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-sm">{hotel.name}</h4>
                    <span className="text-yellow-400 text-xs">★ {hotel.rating}</span>
                  </div>
                  <p className="text-white/40 text-xs">{hotel.area} · {hotel.price}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold mt-6 mb-4">Hidden Gems</h3>
            <div className="space-y-4">
              {[
                { name: "Divar Island", desc: "Quiet island accessible by ferry, untouched by tourism" },
                { name: "Khandepar Caves", desc: "Ancient rock-cut caves older than most Goan churches" },
              ].map((gem) => (
                <div key={gem.name} className="p-3 rounded-lg bg-white/5">
                  <h4 className="font-medium text-sm">{gem.name}</h4>
                  <p className="text-white/40 text-xs mt-1">{gem.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Info */}
        <div className="p-6 rounded-xl bg-white/5 border border-white/5 mb-10">
          <h3 className="font-semibold mb-3">Safety Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">8.5</div>
              <div className="text-white/40 text-xs mt-1">Safety Score</div>
            </div>
            <div>
              <div className="text-sm font-medium">112</div>
              <div className="text-white/40 text-xs mt-1">Emergency</div>
            </div>
            <div>
              <div className="text-sm font-medium">Panjim, Old Goa</div>
              <div className="text-white/40 text-xs mt-1">Safe Areas</div>
            </div>
            <div>
              <div className="text-sm font-medium">Beach after 11pm</div>
              <div className="text-white/40 text-xs mt-1">Avoid</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-10 rounded-2xl bg-gradient-to-br from-orange-600/20 to-orange-900/10 border border-orange-500/20">
          <h2 className="text-2xl font-bold mb-2">This is what AI generates for you</h2>
          <p className="text-white/50 mb-6">Sign up free and create your perfect trip in seconds</p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold transition shadow-lg shadow-orange-600/25"
          >
            Start Planning — It&apos;s Free
          </Link>
        </div>
      </div>
    </div>
  );
}
