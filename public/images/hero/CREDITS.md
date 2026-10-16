# Hero banner credits

The homepage hero banners are stored here so they are served from the app
origin (fast, cacheable, no third-party request at runtime). They are used by
the demo hero-slide seeder (`npm run seed:demo`).

All photos come from [Unsplash](https://unsplash.com) and are used under the
[Unsplash License](https://unsplash.com/license) (free to use, including
commercially; attribution not required but appreciated).

| File | Unsplash photo |
| --- | --- |
| `signature-burgers.jpg` | https://images.unsplash.com/photo-1551782450-a2132b4ba21d |
| `pizza-sharing.jpg` | https://images.unsplash.com/photo-1769521140317-5c6dcd1266e7 |
| `fresh-delicious.jpg` | https://images.unsplash.com/photo-1747292718361-c838a9968ec7 |
| `special-offers.jpg` | https://images.unsplash.com/photo-1682264933304-1943bfa8df38 |
| `customer-favorites.jpg` | https://images.unsplash.com/photo-1780037384670-63862da64775 |

Each file is a 1920×1080 (16:9) JPEG re-encoded from the Unsplash CDN with a
high-quality crop (`w=1920&h=1080&fit=crop&crop=entropy&q=78`). They contain no
text, logos or watermarks. Replace these files with the restaurant's own
photography when available.
