import type { PageContent, PageKey } from "./types";

/**
 * Starting text for the static pages. It describes what this codebase actually
 * does. It contains no company details: the owner must complete and verify it,
 * and legal pages should be reviewed by a qualified legal professional.
 */
export const pages: Record<PageKey, { isLegal: boolean; en: PageContent; fr: PageContent; ar: PageContent }> = {
  about: {
    isLegal: false,
    en: {
      slug: "about",
      title: "About us",
      seoDescription: "Who we are, what our free online tools do, and how we keep them private, accurate and easy to use.",
      html: `<p>This website offers free online tools for everyday tasks with images, text and numbers, together with practical guides that explain how to use them well. Every tool works without an account.</p><h2>Our approach</h2><ul><li><strong>Privacy first.</strong> Our current tools process your files and text inside your browser. They are not uploaded to our servers.</li><li><strong>Honest results.</strong> Tools report exactly what they did, including when a result is larger or a file cannot be processed.</li><li><strong>Three languages.</strong> Tools and pages are available in English, French and Arabic.</li></ul><h2>How we create content</h2><p>Our guides are written and reviewed by people before publication. Read our <a href="/en/editorial-policy">editorial policy</a> and <a href="/en/corrections-policy">corrections policy</a> to learn more.</p><h2>Advertising</h2><p>To keep the tools free, the site may display advertising. Advertisements are always labelled and kept separate from tool controls and results.</p>`,
    },
    fr: {
      slug: "a-propos",
      title: "À propos",
      seoDescription: "Qui nous sommes, ce que font nos outils en ligne gratuits et comment nous les gardons privés, exacts et simples.",
      html: `<p>Ce site propose des outils en ligne gratuits pour les tâches quotidiennes sur les images, les textes et les nombres, ainsi que des guides pratiques pour bien les utiliser. Aucun outil ne nécessite de compte.</p><h2>Notre approche</h2><ul><li><strong>La confidentialité d’abord.</strong> Nos outils actuels traitent vos fichiers et textes dans votre navigateur. Ils ne sont pas envoyés à nos serveurs.</li><li><strong>Des résultats honnêtes.</strong> Les outils indiquent exactement ce qu’ils ont fait, y compris lorsqu’un résultat est plus lourd ou qu’un fichier ne peut pas être traité.</li><li><strong>Trois langues.</strong> Outils et pages sont disponibles en français, en anglais et en arabe.</li></ul><h2>Comment nous créons nos contenus</h2><p>Nos guides sont rédigés et relus par des personnes avant publication. Consultez notre <a href="/fr/politique-editoriale">politique éditoriale</a> et notre <a href="/fr/politique-de-correction">politique de correction</a>.</p><h2>Publicité</h2><p>Pour que les outils restent gratuits, le site peut afficher de la publicité. Les annonces sont toujours identifiées et séparées des commandes et des résultats des outils.</p>`,
    },
    ar: {
      slug: "من-نحن",
      title: "من نحن",
      seoDescription: "من نحن، وماذا تقدّم أدواتنا المجانية عبر الإنترنت، وكيف نحافظ على خصوصيتها ودقتها وسهولة استخدامها.",
      html: `<p>يقدّم هذا الموقع أدوات مجانية عبر الإنترنت للمهام اليومية المتعلقة بالصور والنصوص والأرقام، إلى جانب أدلة عملية تشرح كيفية استخدامها جيدًا. لا تتطلب أي أداة إنشاء حساب.</p><h2>نهجنا</h2><ul><li><strong>الخصوصية أولًا.</strong> تعالج أدواتنا الحالية ملفاتك ونصوصك داخل متصفحك، ولا تُرفع إلى خوادمنا.</li><li><strong>نتائج صادقة.</strong> توضّح الأدوات ما قامت به بالضبط، بما في ذلك عندما تكون النتيجة أكبر أو يتعذّر معالجة ملف.</li><li><strong>ثلاث لغات.</strong> الأدوات والصفحات متوفرة بالعربية والفرنسية والإنجليزية.</li></ul><h2>كيف نُعدّ المحتوى</h2><p>يكتب أشخاصٌ أدلتنا ويراجعونها قبل النشر. اطّلع على <a href="/ar/السياسة-التحريرية">السياسة التحريرية</a> و<a href="/ar/سياسة-التصحيحات">سياسة التصحيحات</a>.</p><h2>الإعلانات</h2><p>لإبقاء الأدوات مجانية، قد يعرض الموقع إعلانات. تُوسَم الإعلانات دائمًا وتُفصل عن عناصر التحكم في الأدوات ونتائجها.</p>`,
    },
  },
  services: {
    isLegal: false,
    en: {
      slug: "services",
      title: "Services",
      seoDescription: "Web development, mobile apps, UI/UX design, SEO, digital marketing and AI automation by Nexoraat, the Marrakech digital agency behind this site.",
      html: `<p>This site is built and maintained by <a href="https://nexoraat.com">Nexoraat</a>, a digital agency based in Marrakech, Morocco. Beyond the free tools, the team builds high-performance websites, mobile apps and AI-powered digital experiences for businesses in Morocco, Europe and beyond.</p>`,
    },
    fr: {
      slug: "services",
      title: "Services",
      seoDescription: "Développement web, applications mobiles, design UI/UX, SEO, marketing digital et automatisation IA par Nexoraat, l’agence digitale de Marrakech derrière ce site.",
      html: `<p>Ce site est conçu et maintenu par <a href="https://nexoraat.com">Nexoraat</a>, une agence digitale basée à Marrakech, au Maroc. Au-delà des outils gratuits, l’équipe réalise des sites web performants, des applications mobiles et des expériences digitales propulsées par l’IA pour des entreprises au Maroc, en Europe et ailleurs.</p>`,
    },
    ar: {
      slug: "خدماتنا",
      title: "خدماتنا",
      seoDescription: "تطوير الويب وتطبيقات الجوال وتصميم الواجهات وتحسين محركات البحث والتسويق الرقمي والأتمتة بالذكاء الاصطناعي من Nexoraat، الوكالة الرقمية في مراكش التي تقف وراء هذا الموقع.",
      html: `<p>صمّمت هذا الموقع وتتولى صيانته <a href="https://nexoraat.com">Nexoraat</a>، وهي وكالة رقمية مقرها مراكش بالمغرب. إلى جانب الأدوات المجانية، يبني الفريق مواقع ويب عالية الأداء وتطبيقات جوال وتجارب رقمية مدعومة بالذكاء الاصطناعي للشركات في المغرب وأوروبا وغيرهما.</p>`,
    },
  },
  contact: {
    isLegal: false,
    en: {
      slug: "contact",
      title: "Contact us",
      seoDescription: "How to contact us about the tools, the guides, corrections or privacy questions.",
      html: `<p>We welcome questions, bug reports, suggestions for new tools and correction requests.</p><h2>How to reach us</h2><p>Use the contact form on this page, or email us at the address shown, if one is listed. Include the page address and, for tool problems, your browser and device so we can reproduce the issue. Please do not send private files or passwords.</p><h2>What happens to your message</h2><p>We use your email address and message only to reply to you and to improve the site, as described in our <a href="/en/privacy-policy">privacy policy</a>.</p>`,
    },
    fr: {
      slug: "contact",
      title: "Nous contacter",
      seoDescription: "Comment nous contacter au sujet des outils, des guides, des corrections ou de la confidentialité.",
      html: `<p>Vos questions, signalements de bugs, idées de nouveaux outils et demandes de correction sont les bienvenus.</p><h2>Comment nous joindre</h2><p>Utilisez le formulaire de contact de cette page ou, si elle est indiquée, écrivez-nous à l’adresse e-mail affichée. Précisez l’adresse de la page concernée et, pour un problème d’outil, votre navigateur et votre appareil afin que nous puissions le reproduire. N’envoyez ni fichiers privés ni mots de passe.</p><h2>Ce que devient votre message</h2><p>Nous utilisons votre adresse e-mail et votre message uniquement pour vous répondre et améliorer le site, comme décrit dans notre <a href="/fr/politique-de-confidentialite">politique de confidentialité</a>.</p>`,
    },
    ar: {
      slug: "اتصل-بنا",
      title: "اتصل بنا",
      seoDescription: "كيفية التواصل معنا بشأن الأدوات أو الأدلة أو التصحيحات أو أسئلة الخصوصية.",
      html: `<p>نرحّب بأسئلتكم وبلاغات الأخطاء واقتراحات الأدوات الجديدة وطلبات التصحيح.</p><h2>كيف تتواصل معنا</h2><p>استخدم نموذج التواصل في هذه الصفحة، أو راسلنا على عنوان البريد الإلكتروني الظاهر إن وُجد. اذكر رابط الصفحة المعنية، وفي حالة مشكلات الأدوات اذكر متصفحك وجهازك حتى نتمكن من إعادة إنتاج المشكلة. يرجى عدم إرسال ملفات خاصة أو كلمات مرور.</p><h2>ماذا يحدث لرسالتك</h2><p>نستخدم بريدك الإلكتروني ورسالتك فقط للرد عليك وتحسين الموقع، كما هو موضح في <a href="/ar/سياسة-الخصوصية">سياسة الخصوصية</a>.</p>`,
    },
  },
  privacy: {
    isLegal: true,
    en: {
      slug: "privacy-policy",
      title: "Privacy policy",
      seoDescription: "What data this website processes, why, for how long, and the choices you have.",
      html: `<p>This policy explains what personal data this website processes and why. It reflects how the site currently works. If integrations change, this page will be updated and the date above will change.</p><h2>Files and text you use in our tools</h2><p>Our current tools run entirely in your browser. Images, files and text you enter are processed on your device and are <strong>not uploaded</strong> to our servers. Each tool page states where processing happens. If a future tool needs server processing, its page will say so clearly before you use it.</p><p><strong>Background remover:</strong> the first time you use it, your browser downloads an AI model from Hugging Face (huggingface.co) and its processing engine from jsDelivr (cdn.jsdelivr.net), then keeps them in its cache. These providers receive a standard download request, which includes your IP address, but never your images.</p><h2>Data we store on your device</h2><ul><li><strong>Consent choices</strong> (cookie <code>ta_consent</code>, up to 180 days): remembers your privacy choices.</li><li><strong>Language preference</strong> (cookie <code>NEXT_LOCALE</code>): remembers the language you chose.</li><li><strong>Theme</strong> (local storage <code>theme</code>): remembers light or dark mode.</li></ul><p>These are necessary for the site to work as you expect and do not track you across other sites.</p><h2>Optional analytics and advertising</h2><p>If enabled by the site owner, and <strong>only after you consent</strong>:</p><ul><li><strong>Google Analytics</strong> may measure aggregated usage, such as which tools are opened. We never send your text, files, file names or results to analytics.</li><li><strong>Google AdSense</strong> may use cookies or similar technologies to deliver, measure and, if you allow it, personalize advertising.</li></ul><p>You can change or withdraw consent at any time on the Cookie settings page. Google’s use of data is described in Google’s own privacy policy and in “How Google uses information from sites or apps that use our services”.</p><h2>Server and hosting data</h2><p>Like any website, our hosting provider may process technical data such as IP addresses, browser type and requested pages in server logs, for security and to operate the service.</p><h2>Contacting us</h2><p>If you use the contact form or email us, we use your name, address and message only to reply and to improve the site. Messages sent through the form are delivered to our mailbox by email using Google’s Gmail service; the website itself does not store them.</p><h2>Your rights</h2><p>Depending on where you live, you may have rights to access, correct, delete or object to the processing of your personal data. Contact us to exercise them.</p><p><em>Site owner: complete this policy with your identity, contact details, legal bases and retention periods, and have it reviewed by a qualified legal professional.</em></p>`,
    },
    fr: {
      slug: "politique-de-confidentialite",
      title: "Politique de confidentialité",
      seoDescription: "Quelles données ce site traite, pourquoi, pendant combien de temps, et les choix dont vous disposez.",
      html: `<p>Cette politique explique quelles données personnelles ce site traite et pourquoi. Elle reflète le fonctionnement actuel du site. Si des intégrations changent, cette page sera mise à jour et la date ci-dessus changera.</p><h2>Fichiers et textes utilisés dans nos outils</h2><p>Nos outils actuels fonctionnent entièrement dans votre navigateur. Les images, fichiers et textes que vous saisissez sont traités sur votre appareil et <strong>ne sont pas envoyés</strong> à nos serveurs. Chaque page d’outil indique où le traitement a lieu. Si un futur outil nécessite un traitement sur serveur, sa page l’indiquera clairement avant utilisation.</p><p><strong>Suppression d’arrière-plan :</strong> à la première utilisation, votre navigateur télécharge un modèle d’IA depuis Hugging Face (huggingface.co) et son moteur de calcul depuis jsDelivr (cdn.jsdelivr.net), puis les garde en cache. Ces fournisseurs reçoivent une demande de téléchargement classique, qui inclut votre adresse IP, mais jamais vos images.</p><h2>Données stockées sur votre appareil</h2><ul><li><strong>Choix de consentement</strong> (cookie <code>ta_consent</code>, jusqu’à 180 jours) : mémorise vos choix de confidentialité.</li><li><strong>Préférence de langue</strong> (cookie <code>NEXT_LOCALE</code>) : mémorise la langue choisie.</li><li><strong>Thème</strong> (stockage local <code>theme</code>) : mémorise le mode clair ou sombre.</li></ul><p>Ces éléments sont nécessaires au bon fonctionnement du site et ne vous suivent pas sur d’autres sites.</p><h2>Mesure d’audience et publicité facultatives</h2><p>Si le propriétaire du site les active, et <strong>uniquement après votre consentement</strong> :</p><ul><li><strong>Google Analytics</strong> peut mesurer l’utilisation de manière agrégée, par exemple quels outils sont ouverts. Nous n’envoyons jamais vos textes, fichiers, noms de fichiers ou résultats.</li><li><strong>Google AdSense</strong> peut utiliser des cookies ou technologies similaires pour diffuser, mesurer et, si vous l’autorisez, personnaliser la publicité.</li></ul><p>Vous pouvez modifier ou retirer votre consentement à tout moment sur la page Paramètres des cookies. L’utilisation des données par Google est décrite dans la politique de confidentialité de Google.</p><h2>Données de serveur et d’hébergement</h2><p>Comme tout site web, notre hébergeur peut traiter des données techniques (adresse IP, type de navigateur, pages demandées) dans ses journaux, pour la sécurité et le fonctionnement du service.</p><h2>Nous contacter</h2><p>Si vous utilisez le formulaire de contact ou nous écrivez, nous utilisons votre nom, votre adresse et votre message uniquement pour vous répondre et améliorer le site. Les messages envoyés via le formulaire nous sont transmis par e-mail au moyen du service Gmail de Google ; le site lui-même ne les conserve pas.</p><h2>Vos droits</h2><p>Selon votre lieu de résidence, vous pouvez disposer de droits d’accès, de rectification, d’effacement ou d’opposition. Contactez-nous pour les exercer.</p><p><em>Propriétaire du site : complétez cette politique avec votre identité, vos coordonnées, les bases légales et les durées de conservation, et faites-la relire par un professionnel du droit <p><strong>إزالة خلفية الصور:</strong> عند استخدامها لأول مرة، يُنزّل متصفحك نموذج ذكاء اصطناعي من Hugging Face (huggingface.co) ومحرك معالجته من jsDelivr (cdn.jsdelivr.net) ثم يحتفظ بهما في ذاكرته المؤقتة. تتلقى هاتان الجهتان طلب تنزيل عاديًا يتضمن عنوان IP الخاص بك، ولا تصلهما صورك أبدًا.</p>qualifié.</em></p>`,
    },
    ar: {
      slug: "سياسة-الخصوصية",
      title: "سياسة الخصوصية",
      seoDescription: "ما البيانات التي يعالجها هذا الموقع، ولماذا، ولأي مدة، وما الخيارات المتاحة لك.",
      html: `<p>توضح هذه السياسة البيانات الشخصية التي يعالجها هذا الموقع وأسباب ذلك، وهي تعكس طريقة عمل الموقع حاليًا. إذا تغيّرت التكاملات، ستُحدَّث هذه الصفحة ويتغيّر التاريخ أعلاه.</p><h2>الملفات والنصوص التي تستخدمها في أدواتنا</h2><p>تعمل أدواتنا الحالية بالكامل داخل متصفحك. تُعالَج الصور والملفات والنصوص التي تدخلها على جهازك و<strong>لا تُرفع</strong> إلى خوادمنا. توضّح كل صفحة أداة مكان المعالجة، وإذا احتاجت أداة مستقبلية إلى معالجة على الخادم فستذكر صفحتها ذلك بوضوح قبل الاستخدام.</p><h2>البيانات المخزّنة على جهازك</h2><ul><li><strong>خيارات الموافقة</strong> (ملف تعريف الارتباط <code>ta_consent</code>، حتى 180 يومًا): يتذكّر خيارات الخصوصية.</li><li><strong>تفضيل اللغة</strong> (ملف تعريف الارتباط <code>NEXT_LOCALE</code>): يتذكّر اللغة التي اخترتها.</li><li><strong>المظهر</strong> (التخزين المحلي <code>theme</code>): يتذكّر الوضع الفاتح أو الداكن.</li></ul><p>هذه العناصر ضرورية ليعمل الموقع كما تتوقع، ولا تتتبعك في مواقع أخرى.</p><h2>التحليلات والإعلانات الاختيارية</h2><p>إذا فعّلها مالك الموقع، و<strong>بعد موافقتك فقط</strong>:</p><ul><li>قد يقيس <strong>Google Analytics</strong> الاستخدام بشكل إجمالي، مثل الأدوات التي تُفتح. لا نرسل أبدًا نصوصك أو ملفاتك أو أسماء ملفاتك أو نتائجك.</li><li>قد يستخدم <strong>Google AdSense</strong> ملفات تعريف الارتباط أو تقنيات مشابهة لعرض الإعلانات وقياسها، وتخصيصها إذا سمحت بذلك.</li></ul><p>يمكنك تغيير موافقتك أو سحبها في أي وقت من صفحة إعدادات ملفات تعريف الارتباط. ويُوضَّح استخدام Google للبيانات في سياسة الخصوصية الخاصة بـ Google.</p><h2>بيانات الخادم والاستضافة</h2><p>كما في أي موقع، قد يعالج مزوّد الاستضافة بيانات تقنية مثل عنوان IP ونوع المتصفح والصفحات المطلوبة في سجلات الخادم، لأغراض الأمان وتشغيل الخدمة.</p><h2>التواصل معنا</h2><p>إذا استخدمت نموذج التواصل أو راسلتنا، نستخدم اسمك وبريدك ورسالتك فقط للرد عليك وتحسين الموقع. تصلنا الرسائل المرسلة عبر النموذج بالبريد الإلكتروني من خلال خدمة Gmail من Google، ولا يحتفظ بها الموقع نفسه.</p><h2>حقوقك</h2><p>بحسب مكان إقامتك، قد تكون لك حقوق في الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها أو الاعتراض على معالجتها. تواصل معنا لممارستها.</p><p><em>إلى مالك الموقع: أكمل هذه السياسة بهويتك وبيانات التواصل والأسس القانونية ومدد الاحتفاظ، واطلب مراجعتها من مختص قانوني مؤهل.</em></p>`,
    },
  },
  terms: {
    isLegal: true,
    en: {
      slug: "terms-of-use",
      title: "Terms of use",
      seoDescription: "The conditions for using this website, its free tools and its guides.",
      html: `<p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p><h2>Use of the tools</h2><p>The tools are provided free of charge, as is, for personal and professional use. You are responsible for the files and text you process and for checking results before relying on them, especially for financial, legal, medical or other important decisions.</p><h2>No warranty</h2><p>We work to keep tools accurate and available, but we do not guarantee that they are error-free or always available. To the extent permitted by law, we are not liable for losses arising from use of the site.</p><h2>Content</h2><p>Guides are provided for general information. They are not professional advice. Text and design on this site are protected; you may link to our pages freely.</p><h2>Acceptable use</h2><p>Do not misuse the site, attempt to disrupt it, access restricted areas or use it for unlawful purposes.</p><h2>Changes</h2><p>We may update these terms. The date above shows the latest version.</p><p><em>Site owner: add the identity of the operator and the applicable law and jurisdiction, and have these terms reviewed by a qualified legal professional.</em></p>`,
    },
    fr: {
      slug: "conditions-d-utilisation",
      title: "Conditions d’utilisation",
      seoDescription: "Les conditions d’utilisation de ce site, de ses outils gratuits et de ses guides.",
      html: `<p>En utilisant ce site, vous acceptez les présentes conditions. Si vous ne les acceptez pas, merci de ne pas utiliser le site.</p><h2>Utilisation des outils</h2><p>Les outils sont fournis gratuitement, en l’état, pour un usage personnel et professionnel. Vous êtes responsable des fichiers et textes que vous traitez et de la vérification des résultats avant de vous y fier, en particulier pour des décisions financières, juridiques, médicales ou importantes.</p><h2>Absence de garantie</h2><p>Nous nous efforçons de garder les outils exacts et disponibles, sans garantir qu’ils soient exempts d’erreurs ou toujours accessibles. Dans les limites permises par la loi, nous ne sommes pas responsables des pertes liées à l’utilisation du site.</p><h2>Contenus</h2><p>Les guides sont fournis à titre d’information générale et ne constituent pas un conseil professionnel. Les textes et la conception du site sont protégés ; vous pouvez librement créer des liens vers nos pages.</p><h2>Utilisation acceptable</h2><p>N’utilisez pas le site de manière abusive, ne tentez pas de le perturber, d’accéder aux zones restreintes ou de l’utiliser à des fins illicites.</p><h2>Modifications</h2><p>Nous pouvons mettre à jour ces conditions. La date ci-dessus indique la dernière version.</p><p><em>Propriétaire du site : ajoutez l’identité de l’éditeur, la loi applicable et la juridiction compétente, et faites relire ces conditions par un professionnel du droit qualifié.</em></p>`,
    },
    ar: {
      slug: "شروط-الاستخدام",
      title: "شروط الاستخدام",
      seoDescription: "شروط استخدام هذا الموقع وأدواته المجانية وأدلته.",
      html: `<p>باستخدامك هذا الموقع فإنك توافق على هذه الشروط. إذا لم توافق عليها، يرجى عدم استخدام الموقع.</p><h2>استخدام الأدوات</h2><p>تُقدَّم الأدوات مجانًا وكما هي، للاستخدام الشخصي والمهني. أنت مسؤول عن الملفات والنصوص التي تعالجها وعن التحقق من النتائج قبل الاعتماد عليها، خصوصًا في القرارات المالية أو القانونية أو الطبية أو المهمة.</p><h2>إخلاء الضمان</h2><p>نسعى لإبقاء الأدوات دقيقة ومتاحة، لكننا لا نضمن خلوّها من الأخطاء أو توفرها الدائم. وفي الحدود التي يسمح بها القانون، لا نتحمل المسؤولية عن الخسائر الناتجة عن استخدام الموقع.</p><h2>المحتوى</h2><p>تُقدَّم الأدلة لأغراض المعلومات العامة وليست استشارة مهنية. نصوص الموقع وتصميمه محمية، ويمكنك وضع روابط لصفحاتنا بحرية.</p><h2>الاستخدام المقبول</h2><p>لا تُسئ استخدام الموقع، ولا تحاول تعطيله أو الوصول إلى المناطق المقيدة أو استخدامه لأغراض غير قانونية.</p><h2>التعديلات</h2><p>قد نحدّث هذه الشروط، ويوضّح التاريخ أعلاه آخر إصدار.</p><p><em>إلى مالك الموقع: أضف هوية الجهة المشغّلة والقانون الواجب التطبيق والاختصاص القضائي، واطلب مراجعة هذه الشروط من مختص قانوني مؤهل.</em></p>`,
    },
  },
  cookies: {
    isLegal: true,
    en: {
      slug: "cookie-settings",
      title: "Cookie settings",
      seoDescription: "Which cookies and similar technologies this site uses, and how to change your choices.",
      html: `<p>This page explains the cookies and similar technologies used on this site and lets you change your choices at any time using the panel below.</p><h2>Necessary</h2><ul><li><code>ta_consent</code>: stores your privacy choices (up to 180 days).</li><li><code>NEXT_LOCALE</code>: stores your language preference.</li><li><code>theme</code> (local storage): stores light or dark mode.</li></ul><h2>Analytics (optional)</h2><p>If enabled, Google Analytics sets cookies such as <code>_ga</code> to measure aggregated usage. It loads only after you accept analytics.</p><h2>Advertising (optional)</h2><p>If enabled, Google AdSense and its partners may use cookies to deliver and measure ads and, with your permission, to personalize them. Ad code loads only when allowed by your choices.</p><h2>Withdrawing consent</h2><p>Switch an option off and save. The page reloads so that optional scripts stop running.</p>`,
    },
    fr: {
      slug: "parametres-des-cookies",
      title: "Paramètres des cookies",
      seoDescription: "Quels cookies et technologies similaires ce site utilise, et comment modifier vos choix.",
      html: `<p>Cette page explique les cookies et technologies similaires utilisés sur ce site et vous permet de modifier vos choix à tout moment grâce au panneau ci-dessous.</p><h2>Nécessaires</h2><ul><li><code>ta_consent</code> : enregistre vos choix de confidentialité (jusqu’à 180 jours).</li><li><code>NEXT_LOCALE</code> : enregistre votre préférence de langue.</li><li><code>theme</code> (stockage local) : enregistre le mode clair ou sombre.</li></ul><h2>Mesure d’audience (facultatif)</h2><p>S’il est activé, Google Analytics dépose des cookies comme <code>_ga</code> pour mesurer l’utilisation de manière agrégée. Il ne se charge qu’après votre accord.</p><h2>Publicité (facultatif)</h2><p>Si elle est activée, Google AdSense et ses partenaires peuvent utiliser des cookies pour diffuser et mesurer les annonces et, avec votre accord, les personnaliser. Le code publicitaire ne se charge que si vos choix le permettent.</p><h2>Retirer son consentement</h2><p>Désactivez une option et enregistrez. La page se recharge pour arrêter les scripts facultatifs.</p>`,
    },
    ar: {
      slug: "إعدادات-ملفات-تعريف-الارتباط",
      title: "إعدادات ملفات تعريف الارتباط",
      seoDescription: "ملفات تعريف الارتباط والتقنيات المشابهة التي يستخدمها هذا الموقع، وكيفية تغيير اختياراتك.",
      html: `<p>توضح هذه الصفحة ملفات تعريف الارتباط والتقنيات المشابهة المستخدمة في هذا الموقع، وتتيح لك تغيير اختياراتك في أي وقت عبر اللوحة أدناه.</p><h2>الضرورية</h2><ul><li><code>ta_consent</code>: يحفظ خيارات الخصوصية (حتى 180 يومًا).</li><li><code>NEXT_LOCALE</code>: يحفظ تفضيل اللغة.</li><li><code>theme</code> (التخزين المحلي): يحفظ الوضع الفاتح أو الداكن.</li></ul><h2>التحليلات (اختيارية)</h2><p>عند تفعيله، يضع Google Analytics ملفات مثل <code>_ga</code> لقياس الاستخدام بشكل إجمالي، ولا يُحمَّل إلا بعد موافقتك.</p><h2>الإعلانات (اختيارية)</h2><p>عند تفعيلها، قد يستخدم Google AdSense وشركاؤه ملفات تعريف الارتباط لعرض الإعلانات وقياسها، وتخصيصها بإذنك. ولا يُحمَّل الكود الإعلاني إلا إذا سمحت اختياراتك بذلك.</p><h2>سحب الموافقة</h2><p>عطّل الخيار واحفظ. ستُعاد تحميل الصفحة لإيقاف السكربتات الاختيارية.</p>`,
    },
  },
  "editorial-policy": {
    isLegal: false,
    en: {
      slug: "editorial-policy",
      title: "Editorial policy",
      seoDescription: "How our guides are researched, written, reviewed and updated.",
      html: `<h2>Purpose</h2><p>Our guides explain practical tasks clearly and accurately, and link to tools only where they genuinely help.</p><h2>How we write</h2><ul><li>Guides are written by named authors and reviewed by an editor before publication.</li><li>We test the steps we describe, using our own tools or widely available software.</li><li>We prefer primary and official sources, and we say when something depends on your device, browser or region.</li><li>We do not publish automatically generated articles without human review.</li></ul><h2>Independence and advertising</h2><p>Advertising does not influence our content. If we ever include affiliate links, they will be clearly disclosed on the page.</p><h2>Updates</h2><p>Each guide shows its publication date and, after substantial changes, its update date.</p>`,
    },
    fr: {
      slug: "politique-editoriale",
      title: "Politique éditoriale",
      seoDescription: "Comment nos guides sont documentés, rédigés, relus et mis à jour.",
      html: `<h2>Objectif</h2><p>Nos guides expliquent des tâches pratiques de façon claire et exacte, et renvoient vers nos outils uniquement lorsqu’ils sont réellement utiles.</p><h2>Notre méthode</h2><ul><li>Les guides sont rédigés par des auteurs identifiés et relus par un éditeur avant publication.</li><li>Nous testons les étapes décrites avec nos outils ou des logiciels largement disponibles.</li><li>Nous privilégions les sources primaires et officielles, et précisons quand un point dépend de votre appareil, navigateur ou pays.</li><li>Nous ne publions pas d’articles générés automatiquement sans relecture humaine.</li></ul><h2>Indépendance et publicité</h2><p>La publicité n’influence pas nos contenus. Si nous incluons un jour des liens d’affiliation, ils seront clairement signalés sur la page.</p><h2>Mises à jour</h2><p>Chaque guide affiche sa date de publication et, après des modifications importantes, sa date de mise à jour.</p>`,
    },
    ar: {
      slug: "السياسة-التحريرية",
      title: "السياسة التحريرية",
      seoDescription: "كيف نبحث في أدلتنا ونكتبها ونراجعها ونحدّثها.",
      html: `<h2>الهدف</h2><p>تشرح أدلتنا المهام العملية بوضوح ودقة، ولا تحيل إلى أدواتنا إلا حين تكون مفيدة فعلًا.</p><h2>طريقة عملنا</h2><ul><li>يكتب الأدلةَ كتّابٌ معروفون، ويراجعها محرر قبل النشر.</li><li>نختبر الخطوات التي نصفها باستخدام أدواتنا أو برامج متاحة على نطاق واسع.</li><li>نفضّل المصادر الأولية والرسمية، ونوضح متى يعتمد أمر ما على جهازك أو متصفحك أو بلدك.</li><li>لا ننشر مقالات مولّدة آليًا دون مراجعة بشرية.</li></ul><h2>الاستقلالية والإعلانات</h2><p>لا تؤثر الإعلانات في محتوانا. وإذا أدرجنا يومًا روابط تسويق بالعمولة، فسنفصح عنها بوضوح في الصفحة.</p><h2>التحديثات</h2><p>يعرض كل دليل تاريخ نشره، وتاريخ تحديثه بعد التعديلات الجوهرية.</p>`,
    },
  },
  corrections: {
    isLegal: false,
    en: {
      slug: "corrections-policy",
      title: "Corrections policy",
      seoDescription: "How to report an error and how we correct mistakes in our tools and guides.",
      html: `<p>We aim to be accurate. When we make a mistake, we correct it promptly and transparently.</p><h2>Reporting an error</h2><p>Contact us with the page address, what is wrong, and if possible a source. For tool errors, include the input that produced the wrong result, but never send private files.</p><h2>How we correct</h2><ul><li>Factual errors in guides are fixed and, when the change is significant, noted at the end of the article with the date.</li><li>Tool bugs are fixed in the code and tested before release.</li><li>Minor typos and formatting fixes may be made without a note.</li></ul>`,
    },
    fr: {
      slug: "politique-de-correction",
      title: "Politique de correction",
      seoDescription: "Comment signaler une erreur et comment nous corrigeons nos outils et nos guides.",
      html: `<p>Nous visons l’exactitude. Lorsque nous faisons une erreur, nous la corrigeons rapidement et en toute transparence.</p><h2>Signaler une erreur</h2><p>Contactez-nous en indiquant l’adresse de la page, ce qui est inexact et, si possible, une source. Pour une erreur d’outil, précisez les données qui ont produit le mauvais résultat, sans jamais envoyer de fichiers privés.</p><h2>Notre façon de corriger</h2><ul><li>Les erreurs factuelles des guides sont corrigées et, si la modification est importante, signalées en fin d’article avec la date.</li><li>Les bugs des outils sont corrigés dans le code et testés avant mise en ligne.</li><li>Les petites coquilles et corrections de mise en forme peuvent être faites sans mention.</li></ul>`,
    },
    ar: {
      slug: "سياسة-التصحيحات",
      title: "سياسة التصحيحات",
      seoDescription: "كيفية الإبلاغ عن خطأ وكيف نصحّح الأخطاء في أدواتنا وأدلتنا.",
      html: `<p>نسعى إلى الدقة، وعندما نخطئ نصحّح الخطأ بسرعة وشفافية.</p><h2>الإبلاغ عن خطأ</h2><p>تواصل معنا مع ذكر رابط الصفحة وما هو غير صحيح، ومصدر إن أمكن. وفي أخطاء الأدوات، اذكر المدخلات التي أدت إلى النتيجة الخاطئة، دون إرسال ملفات خاصة أبدًا.</p><h2>كيف نصحّح</h2><ul><li>تُصحَّح الأخطاء المعلوماتية في الأدلة، وعندما يكون التغيير مهمًا يُشار إليه في نهاية المقال مع التاريخ.</li><li>تُصلَح أخطاء الأدوات في الكود وتُختبر قبل النشر.</li><li>قد تُجرى تصحيحات الأخطاء الإملائية والتنسيق البسيطة دون إشارة.</li></ul>`,
    },
  },
};
