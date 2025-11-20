# TODO: Remove Eligible for Induction Criteria

## Steps to Complete
- [ ] Remove the "Eligible for Induction" switch from the frontend form in `app/hr/onboarding/page.tsx`
- [ ] Update the createUser function to not send induction_eligible in the request
- [ ] In `backend/routes/hr.js`, default induction_eligible to true for all new users and remove it from the response
- [ ] Test user creation to ensure new users are eligible for induction by default
