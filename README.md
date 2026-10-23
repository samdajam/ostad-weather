# Ostad Weather

Ostad Weather is a lightweight weather lookup app built with React and powered by an n8n workflow. Enter a city or country to see current conditions alongside a few interesting facts about the location.

## How it works

1. Choose a location using the search field or a quick-search suggestion.
2. The app sends the location to the n8n webhook as the `loc` query parameter.
3. The workflow uses a Weather API to retrieve current conditions and an AI agent to generate location trivia.
4. Ostad Weather displays the weather details and renders the trivia in a readable format.

The app currently calls:

```text
https://hopeu.app.n8n.cloud/webhook/weather-api?loc=<location>
```

The workflow response is expected to be an array containing one object with `location` and `current` data, and another object with a Markdown `output` string for the trivia.

## Features

- Search by city or country
- Quick-search suggestions, including Dhaka
- Current temperature, feels-like temperature, condition, wind, humidity, UV, and visibility
- Location trivia with formatted Markdown
- Loading and error feedback

## Development

This project uses Vite, React, and TypeScript.

```sh
npm install
npm run dev
```

To create a production build:

```sh
npm run build
```

## Integrations

The n8n workflow and Weather API are external services. The webhook must be active and reachable by the browser, and the workflow response should include the expected location, current-weather, and trivia fields. The browser must also be allowed to make requests to the webhook origin (CORS).

Update the webhook URL in `src/pages/Index.tsx` if your workflow endpoint changes.

## Project structure

- `src/pages/Index.tsx` — weather search interface, webhook request, and response display
- `src/App.tsx` — application routes and providers
- `src/components/` — shared and UI components
- `src/globals.css` — global styles

## Copyright

© Sikander. Visit [sikander.dev](https://sikander.dev).

## License

No license has been specified.
