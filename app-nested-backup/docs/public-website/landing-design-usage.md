# Public Landing Page – Design Usage & Content Keys

Reference: [landing-page-design.json](./ui/landing-page-design.json)

## Breakpoints

- `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px
- Container max-width: 1280px (`max-w-public-container`)
- Section padding: `py-12 md:py-16 lg:py-20`

## Design Tokens (Tailwind)

- **Brand:** `bg-brand-primary`, `bg-brand-primary-hover`, `text-brand-primary`, `bg-brand-secondary-accent`
- **Footer:** `bg-footer-dark`, `bg-footer-darker`, `text-inverse-heading`, `text-inverse-body`
- **Text:** `text-text-heading`, `text-text-body`, `text-text-muted`
- **Surfaces:** `bg-surface-light`, `border-border-light`, `border-border-input`
- **Radius:** `rounded-public-button`, `rounded-public-card`, `rounded-hero-banner`, `rounded-pill`
- **Shadow:** `shadow-card-hover`, `shadow-modal`
- **Typography:** `text-hero-title`, `text-section-title`, `text-card-title`, `text-body-main`, `text-label-small`, `text-price-tag`

## i18n Keys by Section

| Section                | Keys                                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header (top bar)**   | `footer.phoneNumber`, `footer.emailAddress`, `header.searchPlaceholder`                                                                                                                                                      |
| **Header (main)**      | `nav.*`, `common.search`, `nav.login`, `nav.register`                                                                                                                                                                        |
| **Category bar**       | `nav.equipment`, `nav.studios`, `nav.packages`, `nav.buildKit`, `nav.howItWorks`                                                                                                                                             |
| **Hero**               | `home.heroTitle`, `home.heroSubtitle`, `common.bookNow`, `home.exploreStudios`                                                                                                                                               |
| **Featured equipment** | `home.featuredEquipment`, `common.viewAll`, `common.pricePerDay`, `common.unavailable`                                                                                                                                       |
| **Top Brands**         | `home.topBrandsTitle`, `common.productsCount`                                                                                                                                                                                |
| **How it works**       | `home.howItWorksTitle`, `home.howItWorksStep1`, `home.howItWorksStep2`, `home.howItWorksStep3`                                                                                                                               |
| **Testimonials**       | `home.testimonialsTitle`, `home.testimonials` (array of `{ quote, authorName, rating }`)                                                                                                                                     |
| **FAQ**                | `faq.title`, `faq.q1`–`faq.q3`, `faq.a1`–`faq.a3`                                                                                                                                                                            |
| **CTA**                | `home.ctaTitle`, `home.ctaButton`                                                                                                                                                                                            |
| **Footer (columns)**   | `footer.contactUs`, `footer.brand`, `footer.category`, `footer.about`, `footer.aboutText`, `footer.gotQuestion`, `footer.phoneNumber`, `footer.emailAddress`, `footer.followUs`, `footer.paymentMethods`, `footer.copyright` |
| **Footer (links)**     | `nav.equipment`, `nav.studios`, `nav.packages`, `nav.buildKit`, `nav.howItWorks`, `nav.support`, `nav.policies`                                                                                                              |

Edit `src/messages/ar.json`, `en.json`, `zh.json` to change copy.
