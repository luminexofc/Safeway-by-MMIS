import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  ClipboardCheck,
  LocateFixed,
  MapPin,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon,
  FileSearchIcon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  WaterEnergyIcon,
  TrafficLightIcon,
  Flag01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import PageHeader from "../components/PageHeader";
import BeuiBadge from "../components/beui/BeuiBadge";
import MapView from "../components/MapView";
import {
  useGeolocation,
  reverseGeocodeAddress,
  geocode,
  fetchRoutes,
  snapToRoad,
  accuracyLabel,
  COUNTRY_CENTER,
} from "../services/geo";
import { useSession } from "../lib/session";
import { callFunction, sha256Hex, uploadReportPhoto } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import { onRadioKey } from "../lib/radio";
import { useLang } from "../lib/lang";
import "./report.css";

// Icons stay here; every word lives in COPY so the wizard speaks one language.
const OCCURRENCE_META = [
  { value: "waterlogging", icon: WaterEnergyIcon },
  { value: "traffic_jam", icon: TrafficLightIcon },
  { value: "protest", icon: Flag01Icon },
  { value: "road_hazard", icon: AlertCircleIcon },
];

const STEP_ICONS = [TriangleAlert, MapPin, Camera, ClipboardCheck];

const NEXT_STEP_ICONS = [SentIcon, FileSearchIcon, CheckmarkCircle02Icon, CancelCircleIcon];

const COPY = {
  en: {
    myLocation: "Your current location",
    pageTitle: "Report an occurrence",
    pageDesc: "Choose what is happening, mark the location, add details, and submit for verification.",
    progress: "Report progress",
    steps: ["Occurrence", "Location", "Details", "Review"],
    occurrences: {
      waterlogging: {
        label: "Waterlogging",
        alt: "জলাবদ্ধতা",
        description: "Flooded street or road section. Mark where the flooding begins and where it ends.",
      },
      traffic_jam: {
        label: "Traffic jam",
        alt: "যানজট",
        description: "Heavy traffic, standstill, or bottleneck at a specific road or intersection.",
      },
      protest: {
        label: "Protest / Rally",
        alt: "বিক্ষোভ / সমাবেশ",
        description: "Rally, public demonstration, or crowd gathering affecting roads and traffic.",
      },
      road_hazard: {
        label: "Road hazard",
        alt: "সড়ক বিপদ",
        description: "Pothole, broken pavement, fallen tree, construction, or physical obstruction.",
      },
    },
    severity: {
      waterlogging: {
        label: "Water depth",
        items: [
          { label: "Ankle-deep", value: "ankle" },
          { label: "Knee-deep", value: "knee" },
          { label: "Waist-deep", value: "waist" },
          { label: "Road closed", value: "road_closed" },
        ],
      },
      traffic_jam: {
        label: "Traffic severity",
        items: [
          { label: "Slow moving", value: "ankle", desc: "10–15 min delay" },
          { label: "Heavy traffic", value: "knee", desc: "15–30 min delay" },
          { label: "Gridlock", value: "waist", desc: "Standstill over 30 min" },
          { label: "Complete roadblock", value: "road_closed", desc: "No movement" },
        ],
      },
      protest: {
        label: "Gathering status and traffic impact",
        items: [
          { label: "Passable with caution", value: "ankle", desc: "Slight delay, traffic moving" },
          { label: "Partial lane block", value: "knee", desc: "One or more lanes occupied" },
          { label: "Intersection blocked", value: "waist", desc: "Main junction closed" },
          { label: "Major blockade", value: "road_closed", desc: "Complete area shutdown" },
        ],
      },
      road_hazard: {
        label: "Hazard severity",
        items: [
          { label: "Minor pothole", value: "ankle", desc: "Slow down needed" },
          { label: "Deep crater", value: "knee", desc: "Risk of vehicle damage" },
          { label: "Broken road / debris", value: "waist", desc: "Single lane passable" },
          { label: "Impassable", value: "road_closed", desc: "Road blocked entirely" },
        ],
      },
    },
    protestRanges: [
      { label: "Spot (~100 m)", meters: 120, desc: "Single building front" },
      { label: "Block (~300 m)", meters: 300, desc: "Street or intersection" },
      { label: "Wide area (~600 m)", meters: 600, desc: "Major roundabout or district" },
    ],
    nextSteps: [
      { title: "Submitted", desc: "Your report enters the review queue." },
      { title: "Reviewed", desc: "An operator checks the location and details." },
      { title: "Verified", desc: "The report appears on the safety map." },
      { title: "Not verified", desc: "It does not appear as a road condition on the map." },
    ],
    initialPin: "Bangladesh. Drag the pin, search, or tap the map.",
    movedToRoad: (m) => `Moved ${m} m onto the nearest road.`,
    accuracy: (label) => `Your position is accurate ${label}. Drag the pin or search for an exact spot if that is too broad.`,
    step1Title: "What are you reporting?",
    step1Help: "The type decides which location tools and details you get next.",
    occurrenceType: "Occurrence type",
    continueToLocation: "Continue to location",
    step2Title: {
      waterlogging: "Mark where the flooding starts and ends",
      traffic_jam: "Pin the traffic jam",
      protest: "Pin the gathering and its area",
      road_hazard: "Pin the hazard",
    },
    step2Help: {
      waterlogging: "Search below or tap the map to set each end of the flooded road.",
      traffic_jam: "Find the bottleneck, roundabout, or road point where traffic is stopped.",
      protest: "Find the gathering point, then set how much road the crowd affects.",
      road_hazard: "Find the exact point of the pothole, damage, or obstruction.",
    },
    whichEnd: "Which end are you placing?",
    startFrom: "Start (from)",
    endTo: "End (to)",
    placed: "placed",
    notSetYet: "not set yet",
    perimeter: "Estimated affected perimeter",
    searchLabel: "Search for a location in Bangladesh",
    searchPhStart: "Street, landmark, or area — flooding start",
    searchPhEnd: "Street, landmark, or area — flooding end",
    searchPh: "Street, landmark, or area in Bangladesh",
    clearSearch: "Clear search",
    searchResults: "Search results",
    searching: "Searching places…",
    noPlace: "No place matched that text. Try a road, landmark, or area name.",
    locating: "Locating…",
    useMyLocation: "Use my current location",
    start: "Start",
    point: "Point",
    end: "End",
    resolving: "Resolving address…",
    marked: "Marked",
    back: "Back",
    useThisLocation: "Use this location",
    geoDenied: "Location access is blocked, so the map starts on the country view. Search or tap to place the point.",
    geoLocating: "Finding your position. You can place the point by search or on the map now.",
    geoIdle: "Nothing is submitted until you confirm on the review step.",
    step3Title: {
      waterlogging: "Water depth and evidence",
      traffic_jam: "How bad is the jam?",
      protest: "Impact and evidence",
      road_hazard: "Damage and evidence",
    },
    step3Help: "Severity tells an operator how urgent this is. A photo is optional but speeds verification.",
    addPhoto: "Add a photo of the road",
    photoMeta: "JPG or PNG. A nearby landmark in the frame helps an operator confirm the spot.",
    replacePhoto: (mb) => `${mb} MB · select another file to replace`,
    noteLabel: "Additional details or landmark",
    notePh: {
      waterlogging: "Knee-deep near the hospital gate, rickshaws stuck",
      traffic_jam: "Broken-down bus in the middle lane, police diverting to the flyover",
      protest: "Student rally at the roundabout, crowd moving north",
      road_hazard: "Deep pothole after rain, hard to see at night",
    },
    reviewReport: "Review report",
    step4Title: "Review before sending",
    step4Help: "This is exactly what the operator queue receives. A submitted report stays pending until it is checked.",
    lType: "Type",
    lTo: "To",
    lAffected: "Affected area",
    radius: (m) => `About ${m} m radius`,
    lPhoto: "Photo",
    noneAttached: "None attached",
    lDetails: "Details",
    lStatus: "Status",
    pendingReview: "Pending review",
    whatNext: "What happens next",
    editDetails: "Edit details",
    submitting: "Submitting…",
    submitReport: "Submit report",
    submitFailed: "Could not file the report. Please try again.",
    summaryFlooded: "Flooded road segment",
    summaryLocation: "Location",
    fromPin: (label) => `From ${label}`,
    notSpecified: "Not specified",
    tapToPlace: "Tap map to place",
    startPoint: "Start point",
    endPoint: "End point",
  },
  bn: {
    myLocation: "আপনার বর্তমান অবস্থান",
    pageTitle: "ঘটনা জানান",
    pageDesc: "কী ঘটছে বেছে নিন, অবস্থান চিহ্নিত করুন, তথ্য যোগ করুন এবং যাচাইয়ের জন্য জমা দিন।",
    progress: "রিপোর্টের অগ্রগতি",
    steps: ["ঘটনা", "অবস্থান", "বিস্তারিত", "পর্যালোচনা"],
    occurrences: {
      waterlogging: {
        label: "জলাবদ্ধতা",
        alt: "Waterlogging",
        description: "জলমগ্ন রাস্তা বা সড়কের অংশ। জলাবদ্ধতা কোথা থেকে শুরু হয়ে কোথায় শেষ, তা চিহ্নিত করুন।",
      },
      traffic_jam: {
        label: "যানজট",
        alt: "Traffic jam",
        description: "নির্দিষ্ট সড়ক বা মোড়ে ভারী যানবাহন, স্থবিরতা বা বোতলনেক।",
      },
      protest: {
        label: "বিক্ষোভ / সমাবেশ",
        alt: "Protest / Rally",
        description: "সড়ক ও যান চলাচলে প্রভাব ফেলা সমাবেশ, বিক্ষোভ বা জনসমাগম।",
      },
      road_hazard: {
        label: "সড়ক বিপদ",
        alt: "Road hazard",
        description: "গর্ত, ভাঙা রাস্তা, পড়ে যাওয়া গাছ, নির্মাণকাজ বা ভৌত বাধা।",
      },
    },
    severity: {
      waterlogging: {
        label: "পানির গভীরতা",
        items: [
          { label: "গোড়ালি-গভীর", value: "ankle" },
          { label: "হাঁটু-গভীর", value: "knee" },
          { label: "কোমর-গভীর", value: "waist" },
          { label: "সড়ক বন্ধ", value: "road_closed" },
        ],
      },
      traffic_jam: {
        label: "যানজটের তীব্রতা",
        items: [
          { label: "ধীরগতির চলাচল", value: "ankle", desc: "১০–১৫ মিনিট দেরি" },
          { label: "ভারী যানজট", value: "knee", desc: "১৫–৩০ মিনিট দেরি" },
          { label: "সম্পূর্ণ যানজট", value: "waist", desc: "৩০ মিনিটের বেশি স্থবির" },
          { label: "সম্পূর্ণ সড়ক অবরোধ", value: "road_closed", desc: "চলাচল বন্ধ" },
        ],
      },
      protest: {
        label: "সমাবেশের অবস্থা ও যান চলাচলে প্রভাব",
        items: [
          { label: "সতর্কতার সাথে চলাচলযোগ্য", value: "ankle", desc: "সামান্য দেরি, যান চলাচল স্বাভাবিক" },
          { label: "আংশিক লেন অবরোধ", value: "knee", desc: "এক বা একাধিক লেন দখল" },
          { label: "মোড় অবরোধ", value: "waist", desc: "প্রধান জংশন বন্ধ" },
          { label: "বড় অবরোধ", value: "road_closed", desc: "পুরো এলাকায় চলাচল বন্ধ" },
        ],
      },
      road_hazard: {
        label: "বিপদের তীব্রতা",
        items: [
          { label: "ছোট গর্ত", value: "ankle", desc: "গতি কমানো প্রয়োজন" },
          { label: "গভীর গর্ত", value: "knee", desc: "যানবাহন ক্ষতির ঝুঁকি" },
          { label: "ভাঙা সড়ক / ময়লা", value: "waist", desc: "এক লেন চলাচলযোগ্য" },
          { label: "চলাচলের অনুপযোগী", value: "road_closed", desc: "সড়ক সম্পূর্ণ বন্ধ" },
        ],
      },
    },
    protestRanges: [
      { label: "একটি স্থান (~১০০ মি)", meters: 120, desc: "একটি ভবনের সামনে" },
      { label: "একটি ব্লক (~৩০০ মি)", meters: 300, desc: "সড়ক বা মোড়" },
      { label: "বিস্তৃত এলাকা (~৬০০ মি)", meters: 600, desc: "বড় গোলচত্বর বা জেলা" },
    ],
    nextSteps: [
      { title: "জমা হয়েছে", desc: "আপনার রিপোর্ট যাচাইয়ের সারিতে যুক্ত হয়েছে।" },
      { title: "যাচাই চলছে", desc: "একজন অপারেটর অবস্থান ও তথ্য যাচাই করেন।" },
      { title: "যাচাইকৃত", desc: "রিপোর্টটি নিরাপত্তা মানচিত্রে দেখায়।" },
      { title: "যাচাই হয়নি", desc: "এটি মানচিত্রে সড়কের অবস্থা হিসেবে দেখায় না।" },
    ],
    initialPin: "বাংলাদেশ। পিন টেনে, খুঁজে বা মানচিত্রে চাপ দিয়ে বসান।",
    movedToRoad: (m) => `নিকটতম সড়কে ${m} মিটার সরানো হয়েছে।`,
    accuracy: (label) => `আপনার অবস্থান ${label}। খুব বিস্তৃত মনে হলে পিন টেনে বা খুঁজে সঠিক স্থান বসান।`,
    step1Title: "আপনি কী জানাচ্ছেন?",
    step1Help: "ধরনটি ঠিক করে দেয় এরপর কোন অবস্থান-সরঞ্জাম ও তথ্য লাগবে।",
    occurrenceType: "ঘটনার ধরন",
    continueToLocation: "অবস্থানে এগিয়ে যান",
    step2Title: {
      waterlogging: "জলাবদ্ধতা কোথা থেকে কোথায়, তা চিহ্নিত করুন",
      traffic_jam: "যানজটের স্থান চিহ্নিত করুন",
      protest: "সমাবেশ ও তার এলাকা চিহ্নিত করুন",
      road_hazard: "বিপদের স্থান চিহ্নিত করুন",
    },
    step2Help: {
      waterlogging: "নিচে খুঁজুন বা মানচিত্রে চাপ দিয়ে জলাবদ্ধ সড়কের দুই প্রান্ত নির্ধারণ করুন।",
      traffic_jam: "যেখানে যান আটকে আছে সেই বোতলনেক, গোলচত্বর বা সড়কবিন্দু খুঁজুন।",
      protest: "সমাবেশের স্থান খুঁজুন, তারপর ভিড় কতটা সড়ক প্রভাবিত করছে তা নির্ধারণ করুন।",
      road_hazard: "গর্ত, ক্ষতি বা বাধার সঠিক স্থান খুঁজুন।",
    },
    whichEnd: "কোন প্রান্ত বসাচ্ছেন?",
    startFrom: "শুরু (থেকে)",
    endTo: "শেষ (পর্যন্ত)",
    placed: "বসানো হয়েছে",
    notSetYet: "এখনো বসানো হয়নি",
    perimeter: "আনুমানিক প্রভাবিত পরিধি",
    searchLabel: "বাংলাদেশে স্থান খুঁজুন",
    searchPhStart: "সড়ক, পরিচিত স্থান বা এলাকা — জলাবদ্ধতার শুরু",
    searchPhEnd: "সড়ক, পরিচিত স্থান বা এলাকা — জলাবদ্ধতার শেষ",
    searchPh: "বাংলাদেশে সড়ক, পরিচিত স্থান বা এলাকা",
    clearSearch: "খোঁজা মুছুন",
    searchResults: "খোঁজার ফলাফল",
    searching: "স্থান খোঁজা হচ্ছে…",
    noPlace: "এই লেখার সাথে কোনো স্থান মেলেনি। সড়ক, পরিচিত স্থান বা এলাকার নাম লিখুন।",
    locating: "খোঁজা হচ্ছে…",
    useMyLocation: "আমার বর্তমান অবস্থান ব্যবহার করুন",
    start: "শুরু",
    point: "বিন্দু",
    end: "শেষ",
    resolving: "ঠিকানা খোঁজা হচ্ছে…",
    marked: "চিহ্নিত",
    back: "পেছনে",
    useThisLocation: "এই অবস্থান ব্যবহার করুন",
    geoDenied: "অবস্থানের অনুমতি বন্ধ, তাই মানচিত্র দেশের দৃশ্য দিয়ে শুরু হয়েছে। খুঁজুন বা চাপ দিয়ে বিন্দু বসান।",
    geoLocating: "আপনার অবস্থান খোঁজা হচ্ছে। এখনই খুঁজে বা মানচিত্রে বিন্দু বসাতে পারেন।",
    geoIdle: "পর্যালোচনা ধাপে নিশ্চিত না করলে কিছুই জমা হয় না।",
    step3Title: {
      waterlogging: "পানির গভীরতা ও প্রমাণ",
      traffic_jam: "যানজট কতটা তীব্র?",
      protest: "প্রভাব ও প্রমাণ",
      road_hazard: "ক্ষতি ও প্রমাণ",
    },
    step3Help: "তীব্রতা অপারেটরকে বলে এটি কতটা জরুরি। ছবি ঐচ্ছিক, তবে যাচাই দ্রুত করে।",
    addPhoto: "সড়কের একটি ছবি যোগ করুন",
    photoMeta: "JPG বা PNG। ছবিতে আশপাশের পরিচিত কিছু থাকলে অপারেটর দ্রুত নিশ্চিত করতে পারেন।",
    replacePhoto: (mb) => `${mb} MB · বদলাতে অন্য ফাইল বাছুন`,
    noteLabel: "অতিরিক্ত তথ্য বা পরিচিত স্থান",
    notePh: {
      waterlogging: "হাসপাতালের গেটের কাছে হাঁটু-গভীর, রিকশা আটকে আছে",
      traffic_jam: "মাঝের লেনে বিকল বাস, পুলিশ ফ্লাইওভারে ঘুরিয়ে দিচ্ছে",
      protest: "গোলচত্বরে শিক্ষার্থী সমাবেশ, ভিড় উত্তরে যাচ্ছে",
      road_hazard: "বৃষ্টির পর গভীর গর্ত, রাতে দেখা যায় না",
    },
    reviewReport: "রিপোর্ট দেখে নিন",
    step4Title: "পাঠানোর আগে দেখে নিন",
    step4Help: "অপারেটর সারিতে ঠিক এই তথ্যই যায়। যাচাই না হওয়া পর্যন্ত জমা দেওয়া রিপোর্ট অপেক্ষমাণ থাকে।",
    lType: "ধরন",
    lTo: "শেষ",
    lAffected: "প্রভাবিত এলাকা",
    radius: (m) => `প্রায় ${m} মিটার ব্যাসার্ধ`,
    lPhoto: "ছবি",
    noneAttached: "কোনো ছবি নেই",
    lDetails: "বিস্তারিত",
    lStatus: "অবস্থা",
    pendingReview: "যাচাইয়ের অপেক্ষায়",
    whatNext: "এরপর কী হবে",
    editDetails: "তথ্য সম্পাদনা",
    submitting: "জমা হচ্ছে…",
    submitReport: "রিপোর্ট জমা দিন",
    submitFailed: "রিপোর্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।",
    summaryFlooded: "জলাবদ্ধ সড়কের অংশ",
    summaryLocation: "অবস্থান",
    fromPin: (label) => `শুরু: ${label}`,
    notSpecified: "উল্লেখ করা হয়নি",
    tapToPlace: "বসাতে মানচিত্রে চাপ দিন",
    startPoint: "শুরুর স্থান",
    endPoint: "শেষের স্থান",
  },
};

// English wording for the note we send to the operator queue. The UI may be in
// Bangla, but the stored report keeps one language so reviews stay consistent.
const PAYLOAD_EN = {
  occurrences: {
    waterlogging: "Waterlogging",
    traffic_jam: "Traffic jam",
    protest: "Protest / Rally",
    road_hazard: "Road hazard",
  },
  severity: {
    waterlogging: ["Ankle-deep", "Knee-deep", "Waist-deep", "Road closed"],
    traffic_jam: ["Slow moving", "Heavy traffic", "Gridlock", "Complete roadblock"],
    protest: ["Passable with caution", "Partial lane block", "Intersection blocked", "Major blockade"],
    road_hazard: ["Minor pothole", "Deep crater", "Broken road / debris", "Impassable"],
  },
  values: ["ankle", "knee", "waist", "road_closed"],
};

const payloadLabel = (occurrence, depth) => {
  const index = PAYLOAD_EN.values.indexOf(depth);
  return PAYLOAD_EN.severity[occurrence]?.[index] ?? depth;
};

const severityFor = (occurrence, copy) =>
  (copy.severity[occurrence] ?? copy.severity.waterlogging).items;

const severityLabelFor = (occurrence, copy) =>
  (copy.severity[occurrence] ?? copy.severity.waterlogging).label;

export default function Report() {
  const nav = useNavigate();
  const { user } = useSession();
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;

  // Localised lists. Value/icon/meters stay fixed; only the words change.
  const OCCURRENCES = OCCURRENCE_META.map((meta) => ({
    ...meta,
    label: copy.occurrences[meta.value].label,
    bn: copy.occurrences[meta.value].alt,
    description: copy.occurrences[meta.value].description,
  }));
  const STEPS = STEP_ICONS.map((icon, index) => ({ n: index + 1, t: copy.steps[index], icon }));
  // The sub-label always shows the other language, so its lang tag flips with the UI.
  const otherLang = lang === "en" ? "bn" : "en";

  // Wizard step state
  const [step, setStep] = useState(1);
  const [occurrence, setOccurrence] = useState("waterlogging");

  // Location state
  const [pin, setPin] = useState({ lat: COUNTRY_CENTER[0], lng: COUNTRY_CENTER[1] });
  const [pinLabel, setPinLabel] = useState(COPY.en.initialPin);
  const [pinResolving, setPinResolving] = useState(false);
  const [placedByUser, setPlacedByUser] = useState(false);
  const [snapNote, setSnapNote] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);

  // Waterlogging segment state (from where to where)
  const [segmentActive, setSegmentActive] = useState("start"); // "start" | "end"
  const [segmentEnd, setSegmentEnd] = useState(null);
  const [segmentEndLabel, setSegmentEndLabel] = useState("");
  const [segmentEndResolving, setSegmentEndResolving] = useState(false);
  // Road geometry between the two ends of the flooded stretch. Null until the
  // router answers (or when it cannot), in which case the chord is drawn.
  const [segmentPath, setSegmentPath] = useState(null);

  // Protest scenario state
  const [protestRadius, setProtestRadius] = useState(300);

  // Location search bar state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Details state
  const [depth, setDepth] = useState("knee");
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const placeSeq = useRef(0);
  const lookupId = useRef(0);
  const endLookupId = useRef(0);
  const addressRef = useRef({ division: "unknown", district: undefined });
  const geo = useGeolocation(true);

  // Geocode pin location
  const resolvePinLabel = (ll, immediate) => {
    const id = ++lookupId.current;
    setPinResolving(true);
    if (immediate) setPinLabel(immediate);
    reverseGeocodeAddress(ll.lat, ll.lng)
      .then(({ label, division, district }) => {
        if (lookupId.current === id) {
          setPinLabel(label);
          addressRef.current = { division, district };
        }
      })
      .catch(() => {
        if (lookupId.current === id) {
          setPinLabel(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`);
          addressRef.current = { division: "unknown", district: undefined };
        }
      })
      .finally(() => {
        if (lookupId.current === id) setPinResolving(false);
      });
  };

  // Geocode segment end location
  const resolveEndLabel = (ll, immediate) => {
    const id = ++endLookupId.current;
    setSegmentEndResolving(true);
    if (immediate) setSegmentEndLabel(immediate);
    reverseGeocodeAddress(ll.lat, ll.lng)
      .then(({ label }) => {
        if (endLookupId.current === id) {
          setSegmentEndLabel(label);
        }
      })
      .catch(() => {
        if (endLookupId.current === id) {
          setSegmentEndLabel(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`);
        }
      })
      .finally(() => {
        if (endLookupId.current === id) setSegmentEndResolving(false);
      });
  };

  // Auto adopt user GPS fix if available and not placed by hand
  useEffect(() => {
    if (geo.pos && !placedByUser) {
      setPin(geo.pos);
      resolvePinLabel(geo.pos, copy.myLocation);
      setFitSignal((s) => s + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.pos, placedByUser]);

  // The flooded stretch follows the road between the two marks. A straight
  // chord cuts across whatever sits between them — blocks, rivers, another
  // street — so the segment is drawn from the router's geometry instead. A
  // failed or superseded request falls back to the chord, which keeps the
  // segment visible while offline.
  useEffect(() => {
    if (occurrence !== "waterlogging" || !segmentEnd) {
      setSegmentPath(null);
      return;
    }
    const ctrl = new AbortController();
    let live = true;
    fetchRoutes(pin, segmentEnd, { signal: ctrl.signal })
      .then((routes) => {
        if (!live) return;
        setSegmentPath(routes?.[0]?.coords?.length ? routes[0].coords : null);
      })
      .catch((err) => {
        if (live && err?.name !== "AbortError") setSegmentPath(null);
      });
    return () => {
      live = false;
      ctrl.abort();
    };
    // pin and segmentEnd are new objects on every placement, which is exactly
    // when the stretch has to be re-routed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrence, pin, segmentEnd]);

  // A tap lands wherever the finger is, not on the carriageway. Snap to the
  // nearest road so the stored coordinate is the road, not the roof beside it.
  // If snapping finds nothing nearby, the tapped point is kept unchanged.
  //
  // Snap requests are sequenced: a slow reply for an early tap must never
  // overwrite a later placement the user already made.
  const placePoint = (ll, { onPlaced, onLabel }) => {
    const seq = ++placeSeq.current;
    const tapped = { lat: ll.lat, lng: ll.lng };
    onPlaced(tapped);
    setSnapNote(null);

    // Label once, after snapping settles: two lookups per tap doubles the
    // Nominatim traffic and the first result is always thrown away.
    snapToRoad(tapped)
      .then((snapped) => {
        if (seq !== placeSeq.current) return;
        // Only correct when the change is meaningful but still local.
        if (!snapped || (snapped.distance ?? 0) < 1) {
          onLabel(tapped);
          return;
        }
        const moved = { lat: snapped.lat, lng: snapped.lng };
        onPlaced(moved);
        onLabel(moved);
        setSnapNote(copy.movedToRoad(Math.round(snapped.distance)));
      })
      .catch(() => {
        if (seq === placeSeq.current) onLabel(tapped);
      });
  };

  const movePin = (ll) => {
    setPlacedByUser(true);
    if (occurrence === "waterlogging" && segmentActive === "end") {
      placePoint(ll, { onPlaced: (p) => setSegmentEnd(p), onLabel: resolveEndLabel });
    } else {
      placePoint(ll, { onPlaced: (p) => setPin(p), onLabel: resolvePinLabel });
    }
  };

  const handleMapClick = (ll) => {
    setPlacedByUser(true);
    if (occurrence === "waterlogging") {
      if (segmentActive === "start") {
        placePoint(ll, { onPlaced: (p) => setPin(p), onLabel: resolvePinLabel });
        // If end is not set yet, prompt to set end next
        if (!segmentEnd) {
          setSegmentActive("end");
        }
      } else {
        placePoint(ll, { onPlaced: (p) => setSegmentEnd(p), onLabel: resolveEndLabel });
      }
    } else {
      placePoint(ll, { onPlaced: (p) => setPin(p), onLabel: resolvePinLabel });
    }
  };

  // Address search query with debouncing
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await geocode(val, 5);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const pickSearchResult = (item) => {
    // geocode() already normalises Nominatim into {lat, lng, label, full}.
    // Reading item.lon / item.display_name here silently produced NaN, which
    // aborted the pick and left the pin wherever it was.
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const label = item.label || item.full || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    setPlacedByUser(true);
    setSnapNote(null);
    const coords = { lat, lng };

    if (occurrence === "waterlogging" && segmentActive === "end") {
      setSegmentEnd(coords);
      setSegmentEndLabel(label);
    } else {
      setPin(coords);
      setPinLabel(label);
    }

    setSearchResults([]);
    setSearchQuery("");
    searchInputRef.current?.focus();
    setFitSignal((s) => s + 1);
  };

  // Form submission
  const submit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const imageHash = photo ? await sha256Hex(photo) : undefined;
      const uploaded = photo ? await uploadReportPhoto(photo, user.$id) : null;
      const { division, district } = addressRef.current;

      let placeSummary = pinLabel;
      if (occurrence === "waterlogging") {
        const startShort = pinLabel.split(",")[0].trim() || "Start point";
        const endShort = (
          segmentEndLabel || `${segmentEnd?.lat.toFixed(6)}, ${segmentEnd?.lng.toFixed(6)}`
        )
          .split(",")[0]
          .trim() || "End point";
        placeSummary = `${startShort} to ${endShort}`;
      } else if (occurrence === "traffic_jam") {
        placeSummary = `${pinLabel.split(",").slice(0, 2).join(",")} (Traffic Jam)`;
      } else if (occurrence === "protest") {
        placeSummary = `${pinLabel.split(",").slice(0, 2).join(",")} (Protest Area)`;
      } else if (occurrence === "road_hazard") {
        placeSummary = `${pinLabel.split(",").slice(0, 2).join(",")} (Road Hazard)`;
      }

      const noteLines = [
        `[Report Type: ${PAYLOAD_EN.occurrences[occurrence] || occurrence}]`,
        occurrence === "waterlogging" && segmentEnd
          ? `Segment: (${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}) -> (${segmentEnd.lat.toFixed(6)}, ${segmentEnd.lng.toFixed(6)})`
          : null,
        occurrence === "waterlogging" && segmentEndLabel
          ? `End location: ${segmentEndLabel}`
          : null,
        occurrence === "protest"
          ? `Affected Radius: ~${protestRadius}m (${payloadLabel("protest", depth)})`
          : null,
        occurrence === "traffic_jam"
          ? `Traffic Severity: ${payloadLabel("traffic_jam", depth)}`
          : null,
        occurrence === "road_hazard"
          ? `Hazard Severity: ${payloadLabel("road_hazard", depth)}`
          : null,
        note.trim() ? `Note: ${note.trim()}` : null,
      ].filter(Boolean);

      await callFunction("submit-report", {
        placeLabel: placeSummary.slice(0, 250),
        division,
        district,
        lat: pin.lat,
        lng: pin.lng,
        depth,
        note: noteLines.join("\n").slice(0, 500) || undefined,
        imageFileIds: uploaded ? [uploaded.$id] : undefined,
        imageHash,
      });

      nav("/my-reports");
    } catch (ex) {
      console.error("[report] submit failed:", ex?.code ?? ex?.message ?? ex);
      setSubmitError(friendlyError(ex, copy.submitFailed, lang));
      setSubmitting(false);
    }
  };

  const precise = placedByUser || !!geo.pos;
  const pinPos = [pin.lat, pin.lng];
  const current = OCCURRENCES.find((o) => o.value === occurrence);
  const severityItems = severityFor(occurrence, copy);
  const protestRanges = copy.protestRanges;

  // The flooded stretch follows the road, so it is drawn as a slim line with a
  // narrow halo rather than a wide band: the casing lifts it off the tiles of
  // either theme while the road stays readable underneath.
  const segmentPositions =
    occurrence === "waterlogging" && segmentEnd
      ? (segmentPath ?? [
          [pin.lat, pin.lng],
          [segmentEnd.lat, segmentEnd.lng],
        ])
      : null;

  const mapLines = segmentPositions
    ? [
        {
          id: "waterlogging-casing",
          positions: segmentPositions,
          color: "var(--color-surface)",
          weight: 8,
        },
        {
          id: "waterlogging-segment",
          positions: segmentPositions,
          color: "var(--color-danger)",
          weight: 4,
        },
      ]
    : [];

  const mapMarkers =
    occurrence === "waterlogging" && segmentEnd
      ? [
          {
            id: "segment-end-point",
            pos: [segmentEnd.lat, segmentEnd.lng],
            tone: "danger",
            label: "B",
          },
        ]
      : [];

  // Tapping B again takes the end point off the map. Marker taps never reach
  // the map, so this cannot be mistaken for placing a new point; in-flight
  // reverse-geocode replies are dropped so a stale label cannot resurrect.
  const handleMarkerClick = (id) => {
    if (id !== "segment-end-point") return;
    endLookupId.current += 1;
    setSegmentEnd(null);
    setSegmentEndLabel("");
    setSegmentEndResolving(false);
    setSegmentActive("end");
  };

  const mapRadius =
    occurrence === "protest"
      ? {
          at: [pin.lat, pin.lng],
          meters: protestRadius,
          // The zone is a caution area, not just a drawn circle: colour it so
          // it separates from route lines and blockades on the same map.
          tone: "caution",
        }
      : null;

  const mapChip = pinResolving
    ? copy.resolving
    : occurrence === "waterlogging"
      ? segmentActive === "start"
        ? `${copy.start} (A): ${pinLabel}`
        : `${copy.end} (B): ${segmentEndLabel || copy.tapToPlace}`
      : pinLabel;

  const summaryHeading = occurrence === "waterlogging" ? copy.summaryFlooded : copy.summaryLocation;

  return (
    <div className="report">
      <PageHeader title={copy.pageTitle} description={copy.pageDesc} />

      <ol className="rep-steps" aria-label={copy.progress}>
        {STEPS.map((s) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li
              key={s.n}
              className="rep-step"
              aria-current={active ? "step" : undefined}
              data-done={done}
            >
              {done ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <s.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{s.t}</span>
            </li>
          );
        })}
      </ol>

      <section className="rep-card" aria-labelledby="rep-step-title">
        {/* ── Step 1: occurrence type ─────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <h2 className="rep-title" id="rep-step-title">
                {copy.step1Title}
              </h2>
              <p className="rep-help">{copy.step1Help}</p>
            </div>

            <fieldset className="rep-group">
              <legend>{copy.occurrenceType}</legend>
              <div className="rep-choices rep-choices--2" role="radiogroup" aria-label={copy.occurrenceType}>
                {OCCURRENCES.map((item, index) => {
                  const selected = occurrence === item.value;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setOccurrence(item.value)}
                      onKeyDown={(e) =>
                        onRadioKey(e, index, OCCURRENCES.length, (i) =>
                          setOccurrence(OCCURRENCES[i].value)
                        )
                      }
                      className="rep-choice"
                    >
                      <span className="rep-choice-icon" aria-hidden="true">
                        <HugeiconsIcon icon={Icon} size={18} strokeWidth={2} />
                      </span>
                      <span className="rep-choice-body">
                        <span className="rep-choice-label">{item.label}</span>
                        <span className="rep-choice-sub" lang={otherLang}>
                          {item.bn}
                        </span>
                        <span className="rep-choice-desc">{item.description}</span>
                      </span>
                      {selected && (
                        <Check className="rep-choice-check h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="rep-actions">
              <button
                type="button"
                className="rep-btn rep-btn--primary rep-btn--grow"
                onClick={() => setStep(2)}
              >
                {copy.continueToLocation}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: occurrence-tailored location ────────────────── */}
        {step === 2 && (
          <>
            <div>
              <h2 className="rep-title" id="rep-step-title">
                {copy.step2Title[occurrence] || copy.step2Title.waterlogging}
              </h2>
              <p className="rep-help">
                {copy.step2Help[occurrence] || copy.step2Help.waterlogging}
              </p>
            </div>

            {occurrence === "waterlogging" && (
              <fieldset className="rep-group">
                <legend>{copy.whichEnd}</legend>
                <div
                  className="rep-choices rep-choices--pair"
                  role="radiogroup"
                  aria-label={copy.whichEnd}
                >
                  {[
                    { value: "start", label: copy.startFrom },
                    { value: "end", label: copy.endTo },
                  ].map((item, index) => {
                    const selected = segmentActive === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setSegmentActive(item.value)}
                        onKeyDown={(e) =>
                          onRadioKey(e, index, 2, (i) =>
                            setSegmentActive(i === 0 ? "start" : "end")
                          )
                        }
                        className="rep-choice rep-choice--compact"
                      >
                        <span className="rep-choice-label">{item.label}</span>
                        <span className="rep-choice-sub">
                          {item.value === "start"
                            ? copy.placed
                            : segmentEnd
                              ? copy.placed
                              : copy.notSetYet}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {occurrence === "protest" && (
              <fieldset className="rep-group">
                <legend>{copy.perimeter}</legend>
                <div
                  className="rep-choices rep-choices--3"
                  role="radiogroup"
                  aria-label={copy.perimeter}
                >
                  {protestRanges.map((r, index) => {
                    const selected = protestRadius === r.meters;
                    return (
                      <button
                        key={r.meters}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setProtestRadius(r.meters)}
                        onKeyDown={(e) =>
                          onRadioKey(e, index, protestRanges.length, (i) =>
                            setProtestRadius(protestRanges[i].meters)
                          )
                        }
                        className="rep-choice"
                      >
                        <span className="rep-choice-body">
                          <span className="rep-choice-label">{r.label}</span>
                          <span className="rep-choice-sub">{r.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="rep-search">
              <div className="rep-search-field">
                <Search className="h-4 w-4" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  aria-label={copy.searchLabel}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchQuery("");
                      setSearchResults([]);
                    }
                    if (e.key === "ArrowDown" && searchResults.length) {
                      e.preventDefault();
                      resultsRef.current?.querySelector("button")?.focus();
                    }
                  }}
                  placeholder={
                    occurrence === "waterlogging"
                      ? segmentActive === "start"
                        ? copy.searchPhStart
                        : copy.searchPhEnd
                      : copy.searchPh
                  }
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="rep-search-clear"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      searchInputRef.current?.focus();
                    }}
                    aria-label={copy.clearSearch}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="rep-suggest" ref={resultsRef} aria-label={copy.searchResults}>
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.label}-${r.lat}-${r.lng}-${i}`}
                      type="button"
                      onClick={() => pickSearchResult(r)}
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="rep-search-status" role="status">
                {isSearching
                  ? copy.searching
                  : searchQuery.trim() && !searchResults.length
                    ? copy.noPlace
                    : ""}
              </p>
            </div>

            <div className="rep-map">
              <MapView
                center={pinPos}
                zoom={precise ? 15 : 7}
                pin={{ pos: pinPos }}
                onPinMove={movePin}
                onMapClick={handleMapClick}
                onMarkerClick={handleMarkerClick}
                markers={mapMarkers}
                lines={mapLines}
                radius={mapRadius}
                fitSignal={fitSignal}
                chip={mapChip}
              />
            </div>

            <div>
              <button type="button" className="rep-btn rep-btn--ghost" onClick={geo.locate}>
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
                {geo.status === "locating" ? copy.locating : copy.useMyLocation}
              </button>
            </div>

            {(snapNote || (geo.pos?.accuracy && !placedByUser)) && (
              <p className="rep-precision" role="status">
                {snapNote || copy.accuracy(accuracyLabel(geo.pos.accuracy, lang))}
              </p>
            )}

            <dl className="rep-summary">
              <div>
                <dt>{occurrence === "waterlogging" ? copy.start : copy.point}</dt>
                <dd>
                  {pinResolving ? copy.resolving : pinLabel}
                  <span className="rep-coords">
                    {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                  </span>
                </dd>
              </div>
              {occurrence === "waterlogging" && (
                <div>
                  <dt>{copy.end}</dt>
                  <dd>
                    {segmentEndResolving
                      ? copy.resolving
                      : segmentEndLabel || (segmentEnd ? copy.marked : copy.notSetYet)}
                    {segmentEnd && (
                      <span className="rep-coords">
                        {segmentEnd.lat.toFixed(6)}, {segmentEnd.lng.toFixed(6)}
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div className="rep-actions">
              <button type="button" className="rep-btn rep-btn--ghost" onClick={() => setStep(1)}>
                {copy.back}
              </button>
              <button
                type="button"
                className="rep-btn rep-btn--primary rep-btn--grow"
                onClick={() => setStep(3)}
              >
                {copy.useThisLocation}
              </button>
            </div>

            <p className="rep-foot">
              {geo.status === "denied"
                ? copy.geoDenied
                : geo.status === "locating"
                  ? copy.geoLocating
                  : copy.geoIdle}
            </p>
          </>
        )}

        {/* ── Step 3: occurrence-specific details ─────────────────── */}
        {step === 3 && (
          <>
            <div>
              <h2 className="rep-title" id="rep-step-title">
                {copy.step3Title[occurrence] || copy.step3Title.waterlogging}
              </h2>
              <p className="rep-help">{copy.step3Help}</p>
            </div>

            <fieldset className="rep-group">
              <legend>{severityLabelFor(occurrence, copy)}</legend>
              <div
                className="rep-choices rep-choices--4"
                role="radiogroup"
                aria-label={severityLabelFor(occurrence, copy)}
              >
                {severityItems.map((d, index) => {
                  const selected = depth === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setDepth(d.value)}
                      onKeyDown={(e) =>
                        onRadioKey(e, index, severityItems.length, (i) =>
                          setDepth(severityItems[i].value)
                        )
                      }
                      className="rep-choice rep-choice--compact"
                    >
                      <span className="rep-choice-label">{d.label}</span>
                      {d.desc && <span className="rep-choice-sub">{d.desc}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label className="rep-photo">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
                <span className="rep-photo-icon" aria-hidden="true">
                  <Camera className="h-5 w-5" />
                </span>
                <span className="rep-photo-name">
                  {photo ? photo.name : copy.addPhoto}
                </span>
                <span className="rep-photo-meta">
                  {photo
                    ? copy.replacePhoto((photo.size / 1024 / 1024).toFixed(1))
                    : copy.photoMeta}
                </span>
              </label>
            </div>

            <label className="rep-note">
              <span>
                {copy.noteLabel}
                <em>
                  {note.length}/500
                </em>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder={copy.notePh[occurrence] || copy.notePh.waterlogging}
              />
            </label>

            <div className="rep-actions">
              <button type="button" className="rep-btn rep-btn--ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                type="button"
                className="rep-btn rep-btn--primary rep-btn--grow"
                onClick={() => setStep(4)}
              >
                {copy.reviewReport}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: review and submit ───────────────────────────── */}
        {step === 4 && (
          <>
            <div>
              <h2 className="rep-title" id="rep-step-title">{copy.step4Title}</h2>
              <p className="rep-help">{copy.step4Help}</p>
            </div>

            <dl className="rep-review">
              <div>
                <dt>{copy.lType}</dt>
                <dd>
                  <span lang={lang}>{current?.label}</span> · <span lang={otherLang}>{current?.bn}</span>
                </dd>
              </div>
              <div>
                <dt>{summaryHeading}</dt>
                <dd>
                  {occurrence === "waterlogging" ? copy.fromPin(pinLabel) : pinLabel}
                  <span className="rep-coords">
                    {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                  </span>
                </dd>
              </div>
              {occurrence === "waterlogging" && (
                <div>
                  <dt>{copy.lTo}</dt>
                  <dd>
                    {segmentEndLabel ||
                      (segmentEnd
                        ? `${segmentEnd.lat.toFixed(6)}, ${segmentEnd.lng.toFixed(6)}`
                        : copy.notSpecified)}
                    {segmentEnd && (
                      <span className="rep-coords">
                        {segmentEnd.lat.toFixed(6)}, {segmentEnd.lng.toFixed(6)}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>{severityLabelFor(occurrence, copy)}</dt>
                <dd>{severityItems.find((d) => d.value === depth)?.label}</dd>
              </div>
              {occurrence === "protest" && (
                <div>
                  <dt>{copy.lAffected}</dt>
                  <dd>{copy.radius(protestRadius)}</dd>
                </div>
              )}
              <div>
                <dt>{copy.lPhoto}</dt>
                <dd>{photo ? photo.name : copy.noneAttached}</dd>
              </div>
              {note.trim() && (
                <div>
                  <dt>{copy.lDetails}</dt>
                  <dd>{note.trim()}</dd>
                </div>
              )}
              <div>
                <dt>{copy.lStatus}</dt>
                <dd>
                  <BeuiBadge tone="neutral">{copy.pendingReview}</BeuiBadge>
                </dd>
              </div>
            </dl>

            <div className="rep-panel">
              <h3>{copy.whatNext}</h3>
              <ol className="rep-next">
                {copy.nextSteps.map((s, i) => (
                  <li key={s.title}>
                    <span className="rep-next-icon" aria-hidden="true">
                      <HugeiconsIcon icon={NEXT_STEP_ICONS[i]} size={16} strokeWidth={2} />
                    </span>
                    <div>
                      <strong>{s.title}</strong>
                      <p>{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {submitError && (
              <div className="rep-notice" role="alert">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                <p>{submitError}</p>
              </div>
            )}

            <div className="rep-actions">
              <button
                type="button"
                className="rep-btn rep-btn--ghost"
                onClick={() => setStep(3)}
                disabled={submitting}
              >
                {copy.editDetails}
              </button>
              <button
                type="button"
                className="rep-btn rep-btn--primary rep-btn--grow"
                onClick={submit}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? copy.submitting : copy.submitReport}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
