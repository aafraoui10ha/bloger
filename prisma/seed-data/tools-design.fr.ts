import type { DesignToolKey, ToolContent } from "./types";

export const designToolsFr: Record<DesignToolKey, ToolContent> = {
  "color-palettes": {
    slug: "palettes-de-couleurs",
    title: "Bibliothèque de palettes de couleurs",
    short: "Parcourez 110 palettes professionnelles, créez des harmonies et vérifiez le contraste WCAG. Copiez les codes HEX ou le CSS en un clic.",
    seoTitle: "Palettes de couleurs et générateur – harmonies et contraste WCAG",
    seoDescription: "Bibliothèque gratuite de 110 palettes de couleurs dans 11 styles, avec générateur aléatoire, harmonies (complémentaire, triadique…), contrôle du contraste WCAG et export CSS.",
    about: `<p>Choisir des couleurs qui vont bien ensemble est l’une des difficultés du design. Cette bibliothèque réunit <strong>110 palettes sélectionnées</strong> dans onze styles : moderne, minimal, luxe, corporate, nature, pastel, vintage, sombre, vif, dégradé par paliers et monochrome. Chaque palette compte cinq couleurs, de la plus présente à la plus discrète.</p><h2>Harmonies</h2><p>Choisissez une couleur de base pour voir les combinaisons classiques du cercle chromatique : <strong>complémentaire</strong>, <strong>analogue</strong>, <strong>triadique</strong>, <strong>complémentaire divisée</strong> et <strong>monochrome</strong>. Elles sont calculées dans l’espace HSL.</p><h2>Accessibilité</h2><p>Le contrôle de contraste applique la formule WCAG 2. Un texte courant demande un rapport d’au moins <strong>4,5:1</strong> (niveau AA), un grand texte 3:1, et le niveau AAA exige 7:1. Chaque couleur est aussi testée sur blanc et sur noir.</p><p>Vos favoris sont enregistrés uniquement dans votre navigateur. Rien n’est envoyé à nos serveurs.</p>`,
    steps: [
      "Filtrez la bibliothèque par style ou par couleur, ou cherchez un code HEX.",
      "Cliquez sur une couleur pour copier son code, ou copiez toute la palette.",
      "Appuyez sur « Utiliser » pour ouvrir la palette, voir ses harmonies et tester le contraste.",
      "Copiez la palette en variables CSS, SCSS, Tailwind ou JSON.",
    ],
    examples: ["Trouver une palette corporate sobre pour une présentation", "Vérifier qu’un texte blanc est lisible sur votre couleur de marque", "Générer une palette analogue à partir de la couleur de votre logo"],
    faq: [
      { q: "Puis-je utiliser ces palettes commercialement ?", a: "Oui. Les combinaisons de couleurs ne sont pas protégées : utilisez-les dans tous vos projets." },
      { q: "Que signifient AA et AAA ?", a: "Ce sont des niveaux d’accessibilité WCAG. AA demande un contraste de 4,5:1 pour un texte normal, AAA 7:1. « AA grand texte » signifie que la paire ne convient qu’aux textes grands ou gras." },
      { q: "Où sont stockés mes favoris ?", a: "Dans le stockage local de votre navigateur, sur cet appareil uniquement." },
    ],
  },
  "pattern-generator": {
    slug: "generateur-de-motifs",
    title: "Générateur de motifs",
    short: "Créez des motifs continus géométriques, à pois, rayés, ondulés ou abstraits. Téléchargez-les en SVG, PNG ou CSS.",
    seoTitle: "Générateur de motifs continus – fonds SVG, PNG et CSS",
    seoDescription: "Créez des motifs de fond continus en ligne : pois, grilles, rayures, vagues, hexagones, confettis… Réglez couleurs, espacement, échelle et rotation, puis exportez en SVG, PNG ou CSS.",
    about: `<p>Les motifs apportent de la texture aux sites web, publications, emballages et présentations. Ce générateur dessine <strong>14 motifs continus</strong> répartis en sept familles : géométrique, pois, rayures, grilles, vagues, abstrait et moderne (style Memphis).</p><p>Chaque réglage met à jour l’aperçu : fond et deux couleurs de motif, <strong>espacement</strong>, <strong>échelle</strong>, épaisseur de trait, <strong>rotation</strong> et opacité. Les motifs abstraits utilisent une graine : « Mélanger » donne une nouvelle disposition reproductible. Vous pouvez aussi reprendre les couleurs d’une palette de notre bibliothèque.</p><h2>Formats d’export</h2><ul><li><strong>SVG</strong> : vectoriel, net à toutes les tailles.</li><li><strong>PNG</strong> : image à la taille exacte choisie, avec transparence possible.</li><li><strong>CSS</strong> : un fond prêt à coller, avec la tuile intégrée en SVG.</li></ul><p>Les motifs sont générés dans votre navigateur. Rien n’est envoyé.</p>`,
    steps: [
      "Choisissez un type de motif.",
      "Définissez les couleurs ou reprenez celles d’une palette.",
      "Réglez espacement, échelle, épaisseur, rotation et opacité en regardant l’aperçu.",
      "Indiquez la taille et téléchargez en SVG, PNG ou CSS, ou copiez le code CSS.",
    ],
    examples: ["Un fond à pois discret pour une page d’accueil", "Un motif Memphis coloré pour Instagram", "Une texture de vagues transparente à superposer à une photo"],
    faq: [
      { q: "Les motifs sont-ils continus ?", a: "Oui. Chaque motif répète une tuile qui se raccorde parfaitement. En CSS, une rotation qui n’est pas un multiple de 90° peut laisser une légère jointure ; l’export SVG n’en a pas." },
      { q: "Puis-je utiliser les motifs dans un projet commercial ?", a: "Oui, les motifs que vous créez vous appartiennent." },
      { q: "Comment obtenir un fond transparent ?", a: "Activez « Fond transparent » avant de télécharger en SVG ou PNG." },
    ],
  },
  "chart-designer": {
    slug: "createur-de-graphiques",
    title: "Créateur de graphiques et d’infographies",
    short: "Concevez des graphiques, cartes KPI, frises et infographies prêts à publier. Modifiez données, couleurs et polices, puis téléchargez en PNG, JPG, SVG ou PDF.",
    seoTitle: "Créateur de graphiques et d’infographies – gratuit (PNG, SVG, PDF)",
    seoDescription: "Créez des graphiques et infographies professionnels pour les réseaux sociaux, présentations et rapports. 13 types de graphiques, 12 modèles, 17 polices dont l’arabe, export PNG, JPG, SVG et PDF.",
    about: `<p>Voici un éditeur visuel de graphiques de données. Partez de l’un des <strong>douze modèles</strong>, de l’éditorial minimal au style suisse, du premium sombre à la mise en page magazine, ou d’une toile vierge. Ensuite, modifiez tout directement sur la toile.</p><h2>Des graphiques exacts</h2><p><strong>13 types</strong> sont proposés : barres, barres horizontales, courbes, aires, secteurs, anneau, radar, nuage de points, comparaison, barres et anneaux de progression, cartes KPI, frises chronologiques et listes d’infographie. Saisissez les données dans un tableau ou collez-les depuis Excel ou Google Sheets. Les valeurs sont dessinées à l’échelle et se formatent en pourcentages, devises ou nombres compacts, avec préfixe et suffixe.</p><h2>Une mise en page libre</h2><p>Déplacez, redimensionnez, faites pivoter, alignez et superposez les éléments, avec repères magnétiques et grille. Ajoutez textes, formes, icônes et votre logo. Choisissez un format Instagram, story, Facebook, LinkedIn, présentation ou A4, ou une taille libre. La bibliothèque compte 17 familles de polices libres, dont <strong>Cairo, Tajawal, IBM Plex Sans Arabic et Amiri</strong> pour l’arabe, avec mise en page de droite à gauche.</p><h2>Export</h2><p><strong>PNG</strong> et <strong>JPG</strong> jusqu’à 4×, <strong>SVG</strong> avec polices intégrées et <strong>PDF</strong> prêt à imprimer (A4, Letter, taille du design ou personnalisée) en 300 DPI, avec aperçu avant téléchargement. Les designs sont enregistrés automatiquement dans votre navigateur (IndexedDB) : vos données, logos et créations ne quittent jamais votre appareil.</p>`,
    steps: [
      "Choisissez un modèle et un format, ou partez d’une page vierge.",
      "Sélectionnez un graphique et saisissez ou collez vos données.",
      "Personnalisez type, couleurs, libellés et format des nombres dans le panneau des propriétés.",
      "Choisissez une palette et une association de polices, puis disposez textes, icônes, formes et logo.",
      "Cliquez sur Exporter, vérifiez l’aperçu et téléchargez en PNG, JPG, SVG ou PDF.",
    ],
    examples: ["Une publication Instagram sur la croissance trimestrielle", "Une carte KPI LinkedIn pour un rapport annuel", "Une frise chronologique en arabe pour une présentation", "Une infographie PDF A4 à imprimer"],
    faq: [
      { q: "Faut-il créer un compte ?", a: "Non. Les designs sont enregistrés automatiquement dans votre navigateur. L’onglet Projets permet de les ouvrir, dupliquer ou supprimer." },
      { q: "Mes données sont-elles envoyées ?", a: "Non. Les graphiques sont dessinés et exportés dans votre navigateur. Vos données, logos et designs ne sont jamais envoyés à nos serveurs ni à d’autres services." },
      { q: "L’arabe est-il pris en charge ?", a: "Oui. Le texte arabe est correctement lié et disposé de droite à gauche, et les graphiques s’inversent. Les polices arabes sont intégrées dans les SVG et rendues fidèlement en PNG, JPG et PDF." },
      { q: "Le PDF est-il vectoriel ?", a: "Le PDF contient votre design sous forme d’image à 150 ou 300 DPI : les polices et l’arabe sont identiques à l’écran et l’impression est nette. Pour un rendu entièrement vectoriel, utilisez l’export SVG." },
      { q: "Puis-je modifier un design plus tard ?", a: "Oui. Tout reste modifiable : rouvrez le design depuis Projets, changez données ou couleurs et exportez à nouveau." },
    ],
  },
};
