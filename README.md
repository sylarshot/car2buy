## car2buy

Find a suitable used car to buy in **Hungary** by applying filters and sorting listings by a transparent **match score** (price + mileage + year + keyword relevance).

### Features

- **Hard filters**: fuel, body, transmission, year range, location substring
- **Match scoring**: budget (with flex %), mileage cap, year range
- **CSV import**: paste a CSV export and instantly rank your own listings

### Run locally

```bash
cd car2buy
npm install
npm run dev
```

Open `http://localhost:3000`.

### CSV format

Required columns:

- `id,title,priceHuf,year,mileageKm,fuel,transmission,body`

Optional columns:

- `make,model,imageUrl,location,powerKw,displacementCcm,notes,url,createdAt`

Fuel values supported:

- `petrol`, `hybrid`, `plugin_hybrid`, `electric`

Body values supported:

- `hatchback`, `sedan`, `suv`, `coupe`, `convertible`

### Deploy to Vercel

- **GitHub repo**: create a new repo named `car2buy` under your account: `https://github.com/sylarshot`
- **Push**: push this `car2buy/` folder as the repository root
- **Vercel**: import the GitHub repo in your Vercel project space: `https://vercel.com/sylarshots-projects/`
- **Framework preset**: Next.js (auto-detected)
- **Build command**: `npm run build` (default)
- **Output**: Next.js (default)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
