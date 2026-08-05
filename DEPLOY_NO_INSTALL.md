# Deploying with just a browser — no installs, no admin rights

This gets the app live at a real URL using only websites you sign into. Nothing
gets installed on your work computer. You'll need: the `safety-app.zip` file,
and about 15 minutes.

## Step 1 — Unzip the project

Unzip `safety-app.zip` wherever you like (Downloads is fine). This uses your
computer's built-in unzip — not a new install. You should end up with a
`safety-app` folder containing files like `package.json` and a `prisma` folder.

## Step 2 — Create a GitHub account (if you don't have one)

Go to **github.com** → Sign up. Free.

## Step 3 — Create a new repository

1. Click the **+** in the top right → **New repository**
2. Name it `safety-app` (or anything you like)
3. Leave it **Public** or **Private** — either works
4. Don't check "Add a README" — leave it empty
5. Click **Create repository**

## Step 4 — Upload the project

On the new repo's page, click **uploading an existing file**. Then either:
- Drag the *contents* of your unzipped `safety-app` folder (all the files and
  subfolders, not the outer folder itself) into the browser window, or
- Click **choose your files** and select them all

This may take a minute or two — do **not** include a `node_modules` folder if
one somehow appeared (it shouldn't have; the zip was built without it).

Scroll down, click **Commit changes**.

## Step 5 — Create a Postgres database

You need a real database — the version you unzip locally uses a simple file
that won't work once it's hosted online. Easiest option, done inside the next
step:

1. Go to **vercel.com** → Sign up (you can sign up *with your GitHub account*
   in one click — recommended, it links things automatically)
2. Once logged in, go to the **Storage** tab → **Create Database** → choose
   **Postgres** (or **Neon**, which Vercel also offers) → follow the prompts
3. It'll generate a `DATABASE_URL` for you automatically — you don't need to
   copy/paste anything yet, Vercel remembers it

If you'd rather use a separate provider: **neon.com** or **supabase.com** also
give you a free Postgres database and a connection string through their
website, no install either.

## Step 6 — Import the project into Vercel

1. In Vercel, go to **Add New** → **Project**
2. Select the `safety-app` GitHub repo you just created → **Import**
3. Before clicking Deploy, expand **Build and Output Settings** and set the
   **Build Command** to:
   ```
   npm run build:vercel
   ```
   (this generates the Prisma client, creates all the database tables, then
   builds the app — the schema-creation step it uses, `prisma db push`, is
   safe to run every time you redeploy)
4. Expand **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Auto-filled if you made the database in step 5 inside Vercel; otherwise paste the connection string from Neon/Supabase |
   | `ADMIN_SESSION_SECRET` | Any long random string — generate one at **generate-secret.vercel.app/32** |
   | `BOOTSTRAP_SECRET` | Another long random string, same method |
   | `ADMIN_BOOTSTRAP_EMAIL` | The email you want to log into the admin dashboard with |
   | `ADMIN_BOOTSTRAP_PASSWORD` | The password for that admin login |

5. Click **Deploy**. It'll take a couple of minutes.

## Step 7 — Seed the database and create your admin login

Once deployed, Vercel gives you a URL like `https://safety-app-xyz.vercel.app`.

Visit, in your browser:
```
https://safety-app-xyz.vercel.app/api/bootstrap?secret=<the BOOTSTRAP_SECRET you set>
```

You should see a JSON response confirming the project, teams, SWMS, PPE,
permits, sample workers/supervisors, and your admin account were created.

## Step 8 — Try it

- Worker entry point (what your QR code should point to):
  `https://safety-app-xyz.vercel.app/blind-creek-solar-farm`
- Admin login: `https://safety-app-xyz.vercel.app/admin/login`

## Step 9 — Lock the door behind you

Go back into Vercel's **Environment Variables** and **delete**
`BOOTSTRAP_SECRET` (or change its value to something else), then redeploy.
This stops anyone from being able to re-run the bootstrap endpoint. Your admin
login itself stays intact — this only disables the one-time setup URL.

## If something goes wrong

- **Build fails on the Prisma step** — double check `DATABASE_URL` is set and
  the database is actually reachable (Vercel's own Postgres/Neon integration
  usually just works; a manually pasted connection string is the most common
  source of typos).
- **`/api/bootstrap` says "Invalid or missing secret"** — the `secret=` value
  in your URL has to exactly match `BOOTSTRAP_SECRET` in Vercel's environment
  variables. Copy-paste it rather than retyping.
- **Nothing shows sample workers/teams** — the bootstrap step may not have
  run. Revisit the `/api/bootstrap?secret=...` URL and check the JSON response
  for errors.
