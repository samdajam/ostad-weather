import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, CloudSun, MapPin, Search, Sparkles, Sun, Wind } from "lucide-react";
import { validateLocation, validateLocationFormat } from "@/lib/location-validation";

type Block = { type: "heading" | "paragraph" | "list" | "quote"; text?: string; items?: string[]; level?: number };

function markdownBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push({ type: "list", items: list }); list = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { flush(); blocks.push({ type: "heading", text: heading[2].replace(/[*_`]/g, ""), level: heading[1].length }); }
    else if (/^[-*+]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) list.push(line.replace(/^([-*+]\s+|\d+[.)]\s+)/, ""));
    else if (/^>\s?/.test(line)) { flush(); blocks.push({ type: "quote", text: line.replace(/^>\s?/, "") }); }
    else if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(line.replace(/\|/g, ""))) { /* markdown table separator */ }
    else if (/^\|/.test(line)) { flush(); blocks.push({ type: "paragraph", text: line.replace(/^\||\|$/g, "").split("|").map((part) => part.trim()).join("　·　") }); }
    else { flush(); blocks.push({ type: "paragraph", text: line }); }
  }
  flush();
  return blocks;
}

function inlineText(value: string) {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

type WeatherPayload = {
  location: { name: string; region: string; country: string; localtime: string };
  current: { temp_c: number; feelslike_c: number; condition: { text: string; icon: string }; humidity: number; wind_kph: number; wind_dir: string; uv: number; visibility?: number; vis_km?: number };
  output: string;
};

function parseWeatherResponse(data: unknown): WeatherPayload {
  if (!Array.isArray(data)) throw new Error("The weather response was not in the expected format.");
  const locationNode = data.find((item) => item && typeof item === "object" && "location" in item) as { location?: WeatherPayload["location"]; current?: WeatherPayload["current"] } | undefined;
  const outputNode = data.find((item) => item && typeof item === "object" && "output" in item) as { output?: unknown } | undefined;
  if (!locationNode?.location || !locationNode.current || typeof outputNode?.output !== "string") throw new Error("The response is missing weather or trivia data.");
  return { location: locationNode.location, current: locationNode.current, output: outputNode.output };
}

const suggestions = ["Dhaka", "Tokyo", "Copenhagen", "New York", "Cape Town"];

export default function Index() {
  const [location, setLocation] = useState("");
  const [report, setReport] = useState("");
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [searchedLocation, setSearchedLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);

  async function searchWeather(event?: FormEvent, selected = location) {
    event?.preventDefault();
    if (loading || validating) return;
    const formatCheck = validateLocationFormat(selected);
    if (!formatCheck.valid) { setValidationError(formatCheck.message); return; }
    const query = selected.trim();
    setLocation(query); setValidationError("");
    setValidating(true);
    const check = await validateLocation(query);
    setValidating(false);
    if (!check.valid) { setValidationError(check.message); return; }
    setLoading(true); setError(""); setReport(""); setWeather(null); setSearchedLocation(query);
    try {
      const url = new URL("https://hopeu.app.n8n.cloud/webhook/weather-api");
      url.searchParams.set("loc", query);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Weather request failed (${response.status}). Please try again.`);
      const result = parseWeatherResponse(await response.json());
      setWeather(result);
      setReport(result.output);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the weather report. Please try again.");
    } finally { setLoading(false); }
  }

  const blocks = report ? markdownBlocks(report) : [];
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f9ff] text-[#19365c]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <a className="flex items-center gap-2.5 font-extrabold tracking-tight text-[#245fce]" href="#top"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e3edff]"><CloudSun size={23} /></span><span className="text-xl">Ostad Weather</span></a>
        <span className="hidden items-center gap-2 rounded-full border border-[#e0e9f7] bg-white px-4 py-2 text-xs font-bold text-[#59708e] sm:flex"><span className="h-2 w-2 rounded-full bg-[#48c69a]" /> YOUR LITTLE WEATHER WINDOW</span>
      </header>

      <section id="top" className="relative mx-auto max-w-6xl px-5 pb-14 pt-7 sm:px-8 sm:pt-12">
        <div className="pointer-events-none absolute -right-16 top-0 hidden h-72 w-72 rounded-full bg-[#ffdf93]/40 blur-3xl md:block" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#fff1d6] px-3.5 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#a66a11]"><Sparkles size={14} /> A brighter way to check the weather</div>
            <h1 className="max-w-xl text-[2.85rem] font-black leading-[1.04] tracking-[-.055em] text-[#18365e] sm:text-6xl">The forecast, <span className="text-[#3979e8]">with a little</span> sunshine.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#647b99] sm:text-lg">Pick a place. We’ll bring you a thoughtful weather report for wherever the day takes you.</p>
            <form noValidate onSubmit={(event) => searchWeather(event)} className={`mt-8 flex max-w-xl items-center gap-2 rounded-[22px] border bg-white p-2.5 shadow-[0_14px_40px_rgba(50,93,156,.10)] ${validationError ? "border-[#e8a598] focus-within:border-[#df715a]" : "border-[#e1eaf7] focus-within:border-[#94b8f4]"}`}>
              <MapPin className="ml-3 shrink-0 text-[#7c94b3]" size={20} />
              <input aria-label="City or country" aria-invalid={validationError ? true : undefined} aria-describedby={validationError ? "location-error" : undefined} value={location} onChange={(event) => { setLocation(event.target.value); if (validationError) setValidationError(""); }} placeholder="Enter a city or country..." maxLength={60} className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-semibold text-[#19365c] outline-none placeholder:font-medium placeholder:text-[#a4b3c7]" />
              <button disabled={loading || validating || !location.trim()} className="flex shrink-0 items-center gap-2 rounded-[15px] bg-[#3979e8] px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-[#2869d7] disabled:cursor-not-allowed disabled:opacity-55">{validating ? "Checking…" : loading ? "Looking…" : "Find weather"}<ArrowRight size={16} /></button>
            </form>
            {validationError && <p id="location-error" role="alert" className="mt-3 flex max-w-xl items-start gap-2 rounded-2xl bg-[#fff0ec] px-4 py-3 text-sm font-semibold text-[#a4473a]"><AlertCircle size={17} className="mt-0.5 shrink-0" />{validationError}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-bold text-[#8a9bb1]">TRY</span>{suggestions.map((city) => <button key={city} onClick={() => searchWeather(undefined, city)} className="rounded-full border border-[#e1eaf7] bg-white px-3.5 py-2 text-xs font-bold text-[#59708e] transition hover:border-[#a9c5f5] hover:text-[#3979e8]">{city}</button>)}</div>
          </div>
          <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center sm:h-80">
            <div className="absolute h-56 w-56 rounded-full bg-[#ffdf92] sm:h-64 sm:w-64" />
            <div className="absolute right-[11%] top-[14%] text-[#f1b849]"><Sparkles size={28} /></div>
            <div className="absolute left-[13%] top-[25%] text-[#7eb5f5]"><Sparkles size={18} /></div>
            <Sun className="absolute right-[21%] top-[15%] text-[#f9a83e]" size={53} strokeWidth={1.5} />
            <div className="relative mt-12 flex items-center justify-center"><div className="absolute bottom-[-4px] h-20 w-60 rounded-[50%] bg-[#d7e8ff]" /><CloudSun className="relative z-10 text-[#3979e8] drop-shadow-[0_10px_10px_rgba(57,121,232,.13)]" size={176} strokeWidth={1.35} /></div>
            <div className="absolute bottom-[12%] left-[9%] flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-3 shadow-lg shadow-blue-100/70"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1d6] text-[#f0a736]"><Sun size={20} /></span><span><span className="block text-[10px] font-bold uppercase tracking-wider text-[#8a9bb1]">Somewhere sunny</span><span className="block text-sm font-extrabold text-[#27466e]">Good things ahead</span></span></div>
            <div className="absolute bottom-[20%] right-[6%] rounded-full border border-white/70 bg-white/90 p-3 text-[#3979e8] shadow-lg shadow-blue-100/70"><Wind size={21} /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="overflow-hidden rounded-[28px] border border-[#e2ebf7] bg-white shadow-[0_18px_55px_rgba(50,93,156,.08)]">
          {report ? <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf2f8] bg-[#fbfdff] px-6 py-5 sm:px-9"><div><p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#8ba0bb]">Your weather report</p><h2 className="mt-1 text-2xl font-black tracking-tight text-[#19365c]">{weather ? `${weather.location.name}, ${weather.location.country}` : searchedLocation}</h2><p className="mt-1 text-sm text-[#7186a1]">{weather?.location.localtime}</p></div><span className="flex items-center gap-2 rounded-full bg-[#e9f7f1] px-3.5 py-2 text-xs font-bold text-[#268460]"><span className="h-2 w-2 rounded-full bg-[#43be91]" /> Fresh forecast</span></div>
            {weather && <div className="grid gap-3 border-b border-[#edf2f8] bg-[#f7faff] p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-9"><div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8ba0bb]">Right now</p><div className="mt-2 flex items-center gap-3"><img className="h-12 w-12" src={`https:${weather.current.condition.icon}`} alt="" /><div><p className="text-2xl font-black text-[#19365c]">{weather.current.temp_c}°C</p><p className="text-sm font-semibold text-[#647b99]">{weather.current.condition.text}</p></div></div></div><div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8ba0bb]">Feels like</p><p className="mt-3 text-2xl font-black text-[#19365c]">{weather.current.feelslike_c}°C</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8ba0bb]">Wind · Humidity</p><p className="mt-3 text-lg font-black text-[#19365c]">{weather.current.wind_kph} km/h {weather.current.wind_dir}</p><p className="text-sm font-semibold text-[#647b99]">Humidity {weather.current.humidity}%</p></div><div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#8ba0bb]">UV · Visibility</p><p className="mt-3 text-lg font-black text-[#19365c]">UV {weather.current.uv}</p><p className="text-sm font-semibold text-[#647b99]">{weather.current.vis_km ?? weather.current.visibility ?? "—"} km visibility</p></div></div>}
            <div className="flex items-center gap-2 px-6 pt-6 sm:px-9"><Sparkles size={17} className="text-[#e5a436]" /><h3 className="text-lg font-black text-[#19365c]">Trivia</h3></div>
            <article className="prose prose-slate max-w-none px-6 py-4 prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-[#19365c] prose-p:leading-7 prose-p:text-[#526985] prose-strong:text-[#29466c] prose-li:my-1 prose-li:text-[#526985] prose-code:rounded prose-code:bg-[#eef4ff] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[#3979e8] sm:px-9 sm:py-5">{blocks.map((block, index) => block.type === "heading" ? <h2 key={index} className={block.level === 1 ? "text-2xl" : "text-xl"}>{inlineText(block.text || "")}</h2> : block.type === "list" ? <ul key={index} className="my-4 list-disc pl-6">{block.items?.map((item, itemIndex) => <li key={itemIndex}>{inlineText(item)}</li>)}</ul> : block.type === "quote" ? <blockquote key={index} className="border-l-4 border-[#f3bd51] pl-4 italic text-[#59708e]">{inlineText(block.text || "")}</blockquote> : <p key={index}>{inlineText(block.text || "")}</p>)}</article>
          </> : <div className="flex min-h-40 items-center justify-center px-6 py-10 text-center">{loading ? <div><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-[3px] border-[#dbe8fc] border-t-[#3979e8]" /><p className="font-bold text-[#41638e]">Chasing clouds over {searchedLocation}…</p><p className="mt-1 text-sm text-[#8a9bb1]">Your forecast is on its way.</p></div> : error ? <div className="max-w-md"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0ec] text-[#df715a]"><CloudSun size={23} /></div><p className="font-extrabold text-[#7c3f39]">We couldn’t fetch that forecast</p><p className="mt-2 text-sm leading-6 text-[#8e6b69]">{error}</p><button onClick={() => searchWeather(undefined, searchedLocation)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#3979e8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2869d7]"><Search size={15} /> Try again</button></div> : <div><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#fff5de] text-[#e5a436]"><CloudSun size={26} /></div><p className="font-extrabold text-[#41638e]">Your forecast will appear right here</p><p className="mt-1 text-sm text-[#8a9bb1]">Search for a place to get the skies talking.</p></div>}</div>}
        </div>
        <p className="mt-6 text-center text-xs font-medium text-[#9aabc0]">A little forecast goes a long way! ☀</p>
        <p className="mt-6 text-center text-xs font-medium text-[#9aabc0]">© {new Date().getFullYear()} Sikander · <a href="https://sikander.dev" target="_blank" rel="noreferrer" className="font-bold text-[#3979e8] transition hover:text-[#245fce]">sikander.dev</a>
        </p>
      </section>
    </main>
  );
}
