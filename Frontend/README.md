# BloodBridge Website

Desktop-first BloodBridge website and healthcare portal based on the selected Google Stitch desktop designs.

## Run locally

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open `http://localhost:4173`.

## Included website flows

- Public BloodBridge landing page
- Hospital and donor login
- Donor / medical account registration
- Clinical system overview dashboard
- Emergency blood request form with live summary
- Active blood requests with search and filters
- Blood inventory management
- Donor dashboard and profile
- Donation scheduling
- Blood center finder and map
- Admin dashboard
- User management
- Pending request approvals
- Verification queue

## Demo navigation

- Hospital dashboard: `#/dashboard`
- Donor dashboard: `#/donor-dashboard`
- Admin dashboard: `#/admin`

The prototype is front-end only. Forms and actions simulate the full interaction flow in the browser; production authentication, database storage, maps, alerts, and clinical integrations require a backend/API.
