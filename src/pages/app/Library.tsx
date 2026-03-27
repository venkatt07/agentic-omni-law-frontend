import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BookOpen, FileSearch, GraduationCap, LibraryBig, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/lib/magic-ui";
import { cn } from "@/lib/utils";
import { getLibraryBooksForRole, libraryCategories } from "@/lib/legalLibrary";
import { resolveRole } from "@/lib/role-ui";
import { useAppStore } from "@/store";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";

const libraryHindiPhrases: Record<string, string> = {
  "Practice shelf": "प्रैक्टिस शेल्फ",
  "Study shelf": "स्टडी शेल्फ",
  "Ops shelf": "ऑप्स शेल्फ",
  "Guidance shelf": "मार्गदर्शन शेल्फ",
  "Reference books shaped for active legal work.": "सक्रिय कानूनी कार्य के लिए चुनी गई संदर्भ पुस्तकें।",
  "A real legal library for doctrine, books, and exam prep.": "सिद्धांत, पुस्तकों और परीक्षा तैयारी के लिए एक वास्तविक विधिक लाइब्रेरी।",
  "A legal library focused on business and compliance decisions.": "व्यावसायिक और अनुपालन निर्णयों पर केंद्रित कानूनी लाइब्रेरी।",
  "Plain-language legal references for real-world issues.": "वास्तविक जीवन की समस्याओं के लिए सरल भाषा में कानूनी संदर्भ।",
  "Use the library to ground litigation strategy, issue framing, and statutory interpretation before running agents.": "एजेंट चलाने से पहले वाद-रणनीति, मुद्दों की रूपरेखा और विधिक व्याख्या को मजबूत करने के लिए लाइब्रेरी का उपयोग करें।",
  "This is the main study shelf for law students. Pick a book, understand the topic, and move straight into the right learning workflow.": "यह विधि छात्रों के लिए मुख्य अध्ययन शेल्फ है। पुस्तक चुनें, विषय समझें, और सीधे सही अध्ययन वर्कफ़्लो में जाएँ।",
  "Start from reliable reference material, then move into compliance, contract risk, and executive decision support.": "विश्वसनीय संदर्भ सामग्री से शुरू करें, फिर अनुपालन, कॉन्ट्रैक्ट जोखिम और निर्णय सहयोग की ओर बढ़ें।",
  "The library highlights core materials that help individuals understand disputes before using guided agents.": "यह लाइब्रेरी ऐसे मुख्य स्रोत दिखाती है जो लोगों को guided agents उपयोग करने से पहले विवाद समझने में मदद करते हैं।",
  "Browse books matched to your role and your current legal work.": "अपनी भूमिका और वर्तमान कानूनी कार्य के अनुसार चुनी गई पुस्तकें देखें।",
  "Open a title to move into study, query, or guided legal workflows without losing context.": "किसी शीर्षक को खोलें और संदर्भ खोए बिना अध्ययन, क्वेरी या guided legal workflow में जाएँ।",
  "Use this shelf when you want clarity first, then action.": "जब आपको पहले स्पष्टता और फिर कार्रवाई चाहिए, तब इस शेल्फ का उपयोग करें।",
  "Catalog search": "कैटलॉग खोज",
  "Browse the legal library": "कानूनी लाइब्रेरी देखें",
  "Search books, authors, doctrines, chapters": "पुस्तकें, लेखक, सिद्धांत, अध्याय खोजें",
  "No matching books": "मिलती-जुलती पुस्तकें नहीं मिलीं",
  "Change the category or search terms to widen the library view.": "लाइब्रेरी को व्यापक देखने के लिए श्रेणी या खोज शब्द बदलें।",
  "Placement": "स्थिति",
  "Where this lives in the product": "यह उत्पाद में कहाँ आता है",
  "The library is a dedicated page inside the authenticated workspace. It appears in the sidebar for all roles, with the richest experience designed for law students.": "लाइब्रेरी प्रमाणित वर्कस्पेस के अंदर एक समर्पित पेज है। यह सभी भूमिकाओं के लिए साइडबार में दिखती है, और सबसे समृद्ध अनुभव विधि छात्रों के लिए बनाया गया है।",
  "Workflow": "वर्कफ़्लो",
  "Read first, then launch the most relevant agent when you are ready to act.": "पहले पढ़ें, फिर जब आप कार्रवाई के लिए तैयार हों तब सबसे उपयुक्त एजेंट खोलें।",
  "Each book routes into an existing workflow that matches the reading intent.": "हर पुस्तक उस मौजूदा वर्कफ़्लो में जाती है जो पढ़ने के उद्देश्य से मेल खाता है।",
  "This page is for understanding and preparation, not raw execution.": "यह पेज समझ और तैयारी के लिए है, सीधे निष्पादन के लिए नहीं।",
  "Fast Actions": "त्वरित कार्य",
  "Open Concept Learning": "Concept Learning खोलें",
  "Open Exam Prep": "Exam Prep खोलें",
  "All": "सभी",
  "Constitutional Law": "संवैधानिक विधि",
  "Civil Procedure": "दीवानी प्रक्रिया",
  "Contract Law": "कॉन्ट्रैक्ट विधि",
  "Corporate & Compliance": "कॉरपोरेट और कंप्लायंस",
  Evidence: "साक्ष्य",
  "Property & Family": "संपत्ति और परिवार",
  Advanced: "उन्नत",
  Foundation: "मूलभूत",
  Practice: "प्रायोगिक",
  "Mulla on the Code of Civil Procedure": "मुल्ला ऑन द कोड ऑफ सिविल प्रोसीजर",
  "Sir Dinshaw Fardunji Mulla": "सर दिनशॉ फरदुनजी मुल्ला",
  "Strong for injunctions, pleadings, jurisdiction, and procedural framing in civil litigation.": "दीवानी वाद में injunction, pleadings, jurisdiction और procedural framing के लिए उपयोगी।",
  Jurisdiction: "क्षेत्राधिकार",
  Pleadings: "प्लीडिंग्स",
  "Temporary Injunctions": "अस्थायी निषेधाज्ञाएँ",
  Execution: "निष्पादन",
  "Sarkar on Evidence": "सरकार ऑन एविडेंस",
  Sarkar: "सरकार",
  "Useful for admissibility, burden of proof, presumptions, and evidence strategy.": "admissibility, burden of proof, presumptions और evidence strategy के लिए उपयोगी।",
  Admissions: "Admissions",
  Confessions: "Confessions",
  "Burden of Proof": "Burden of Proof",
  "Documentary Evidence": "Documentary Evidence",
  "Build Exam Notes": "एग्जाम नोट्स बनाएं",
  "Pollock & Mulla on the Indian Contract Act": "पोलॉक और मुल्ला ऑन द इंडियन कॉन्ट्रैक्ट एक्ट",
  "Pollock & Mulla": "पोलॉक और मुल्ला",
  "Deep reference for formation, breach, damages, indemnity, and guarantee analysis.": "formation, breach, damages, indemnity और guarantee analysis के लिए गहरा संदर्भ।",
  "Indian Constitutional Law": "भारतीय संवैधानिक विधि",
  "M.P. Jain": "एम. पी. जैन",
  "Law of Contract and Specific Relief": "Law of Contract and Specific Relief",
  "Avtar Singh": "अवतार सिंह",
  "Corporate Law and Compliance Manual": "कॉरपोरेट विधि और कंप्लायंस मैनुअल",
  "Taxmann Editorial": "टैक्समैन एडिटोरियल",
  "Property Law and Transfer Practice": "संपत्ति विधि और ट्रांसफर प्रैक्टिस",
  "R.K. Sinha": "आर. के. सिन्हा",
  "Bare Acts Starter Shelf": "Bare Acts प्रारंभिक शेल्फ",
  "Official Text Collection": "आधिकारिक पाठ संग्रह",
  "Law Student • Lawyer": "विधि छात्र • वकील",
  "Law Student • Normal Person • Business/Corporate": "विधि छात्र • सामान्य व्यक्ति • बिज़नेस/कॉरपोरेट",
  "Law Student • Lawyer • Business/Corporate": "विधि छात्र • वकील • बिज़नेस/कॉरपोरेट",
  "Law Student • Lawyer • Normal Person": "विधि छात्र • वकील • सामान्य व्यक्ति",
  "Law Student • Lawyer • Business/Corporate • Normal Person": "विधि छात्र • वकील • बिज़नेस/कॉरपोरेट • सामान्य व्यक्ति",
};

function translateLibraryValue(value: string, language: string) {
  const text = String(value || "");
  if (language === "Hindi" && libraryHindiPhrases[text]) return libraryHindiPhrases[text];
  return autoTranslateUiText(text, language);
}

const roleHeadline: Record<string, { eyebrowKey: string; titleKey: string; bodyKey: string }> = {
  Lawyer: {
    eyebrowKey: "library.practiceShelf",
    titleKey: "library.lawyerTitle",
    bodyKey: "library.lawyerBody",
  },
  "Law Student": {
    eyebrowKey: "library.studyShelf",
    titleKey: "library.studentTitle",
    bodyKey: "library.studentBody",
  },
  "Business/Corporate": {
    eyebrowKey: "library.opsShelf",
    titleKey: "library.businessTitle",
    bodyKey: "library.businessBody",
  },
  "Normal Person": {
    eyebrowKey: "library.guidanceShelf",
    titleKey: "library.individualTitle",
    bodyKey: "library.individualBody",
  },
};

export default function Library() {
  const role = useAppStore((state) => state.selectedRole);
  const activeRole = resolveRole(role);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const visibleBooks = useMemo(() => getLibraryBooksForRole(activeRole), [activeRole]);
  const summary = roleHeadline[activeRole] || roleHeadline["Law Student"];
  const { t } = useI18n();
  const language = useAppStore((state) => state.language);
  const translateUi = (value: string) => translateLibraryValue(value, language);

  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return visibleBooks.filter((book) => {
      const matchesCategory = category === "All" || book.category === category;
      if (!matchesCategory) return false;
      if (!normalized) return true;
      const haystack = `${book.title} ${book.author} ${book.category} ${book.whyItMatters} ${book.chapters.join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [category, query, visibleBooks]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <section className="relative overflow-hidden rounded-[2rem] border border-white/45 bg-[linear-gradient(135deg,rgba(8,32,79,0.98),rgba(13,71,196,0.96)_58%,rgba(43,132,255,0.94))] px-6 py-7 text-white shadow-[0_32px_80px_-44px_rgba(2,6,23,0.76)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_48%_at_0%_0%,rgba(255,255,255,0.2),transparent_42%),radial-gradient(48%_42%_at_100%_0%,rgba(34,211,238,0.18),transparent_36%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="max-w-[46rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/86">
                <LibraryBig className="h-3.5 w-3.5" />
                {translateUi(t(summary.eyebrowKey))}
              </div>
              <h1 className="mt-4 text-[2.1rem] font-semibold tracking-[-0.05em] md:text-[3rem]">{translateUi(t(summary.titleKey))}</h1>
              <p className="mt-3 max-w-[40rem] text-sm leading-8 text-white/76 md:text-base">{translateUi(t(summary.bodyKey))}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Card className="border-white/30 bg-white/[0.84] p-4 text-slate-900 shadow-none">
                <div className="text-sm leading-7 text-slate-800">{translateUi(t("library.heroSentenceOne"))}</div>
              </Card>
              <Card className="border-white/30 bg-white/[0.84] p-4 text-slate-900 shadow-none">
                <div className="text-sm leading-7 text-slate-800">{translateUi(t("library.heroSentenceTwo"))}</div>
              </Card>
              <Card className="border-white/30 bg-white/[0.84] p-4 text-slate-900 shadow-none">
                <div className="text-sm leading-7 text-slate-800">{translateUi(t("library.heroSentenceThree"))}</div>
              </Card>
            </div>
          </div>
        </section>
      </FadeIn>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="rounded-[1.5rem] border-border/60 p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{translateUi(t("library.catalogSearch"))}</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{translateUi(t("library.browseTitle"))}</h2>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                placeholder={translateUi(t("library.searchPlaceholder"))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[translateUi(t("library.all")), ...libraryCategories.map((item) => translateUi(item))].map((item, index) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => setCategory(index === 0 ? "All" : libraryCategories[index - 1])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  (index === 0 ? category === "All" : category === libraryCategories[index - 1])
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="rounded-[1.35rem] border-border/60 p-5 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.18)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-primary">{translateUi(book.category)}</div>
                    <h3 className="mt-1 text-[1.15rem] font-semibold tracking-[-0.02em]">{translateUi(book.title)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{translateUi(book.author)}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{translateUi(book.level)}</Badge>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">{translateUi(book.whyItMatters)}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {book.chapters.map((chapter) => (
                    <span key={chapter} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {translateUi(chapter)}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {translateUi(book.audience.join(" • "))}
                  </div>
                  <Link href={book.launchHref}>
                    <Button size="sm" className="rounded-full">{translateUi(book.launchLabel)}</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {filteredBooks.length === 0 ? (
            <Card className="mt-5 rounded-[1.35rem] border-dashed border-border/80 p-8 text-center shadow-none">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{translateUi(t("library.noMatchingBooks"))}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{translateUi(t("library.noMatchingBooksDescription"))}</p>
            </Card>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.5rem] border-border/60 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary">
              <GraduationCap className="h-4 w-4" />
              {translateUi(t("library.placement"))}
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{translateUi(t("library.placementTitle"))}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{translateUi(t("library.placementBody"))}</p>
          </Card>

          <Card className="rounded-[1.5rem] border-border/60 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-4 w-4" />
              {translateUi(t("library.workflow"))}
            </div>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/40 p-3">
                {translateUi(t("library.workflowOne"))}
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                {translateUi(t("library.workflowTwo"))}
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                {translateUi(t("library.workflowThree"))}
              </div>
            </div>
          </Card>

          <Card className="rounded-[1.5rem] border-border/60 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary">
              <FileSearch className="h-4 w-4" />
              {translateUi(t("library.fastActions"))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/app/agents/query">
                <Button variant="outline" className="w-full justify-start rounded-xl">{translateUi(t("common.openQueryParsing"))}</Button>
              </Link>
              <Link href="/app/agents/role/student_concept_learning_books">
                <Button variant="outline" className="w-full justify-start rounded-xl">{translateUi(t("library.openConceptLearning"))}</Button>
              </Link>
              <Link href="/app/agents/role/student_exam_preparation">
                <Button variant="outline" className="w-full justify-start rounded-xl">{translateUi(t("library.openExamPrep"))}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
