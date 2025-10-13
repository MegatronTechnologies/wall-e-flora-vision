# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6f57ff6c-8105-4412-aa58-20836cc6cf0a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6f57ff6c-8105-4412-aa58-20836cc6cf0a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Run the project inside Docker

When you want to hack locally without affecting other containers on your machine, you can run the Vite dev server in Docker.

```sh
# Build the image and start the dev server
docker compose up --build

# Visit the app on http://localhost:43173
```

- The container listens on `43173` by default so it stays out of the way of other projects. Set `DEV_PORT=your_port` before running `docker compose up` if you need a different mapping.
- Hot reload works because the project folder is bind-mounted into the container; install dependencies inside the container only.
- When you are done, run `docker compose down` to stop and remove the dev container.

**Integrate Raspberry Pi**

- `raspberry-pi/README.md` faylında Raspberry Pi-dən Lovable Cloud-a məlumat göndərilməsi üçün addım-addım təlimat var.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6f57ff6c-8105-4412-aa58-20836cc6cf0a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
