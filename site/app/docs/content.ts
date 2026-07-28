export type GuideContent = {
  id: "en" | "es" | "ja" | "zh-hant";
  lang: "en" | "es" | "ja" | "zh-Hant";
  shortLabel: string;
  languageName: string;
  summary: string;
  eyebrow: string;
  title: string;
  lede: string;
  thesis: string;
  journey: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: Array<{
      code: string;
      label: string;
      title: string;
      body: string;
    }>;
  };
  principles: {
    eyebrow: string;
    title: string;
    items: Array<{
      marker: string;
      title: string;
      body: string;
    }>;
  };
  width: {
    eyebrow: string;
    title: string;
    intro: string;
    cases: Array<{
      columns: string;
      label: string;
      output: string;
      note: string;
    }>;
    caption: string;
  };
  rollback: {
    eyebrow: string;
    title: string;
    intro: string;
    phases: Array<{
      number: string;
      title: string;
      body: string;
    }>;
    warningTitle: string;
    warningBody: string;
  };
  privacy: {
    eyebrow: string;
    title: string;
    intro: string;
    facts: Array<{
      title: string;
      body: string;
    }>;
    aliasTitle: string;
    aliasBody: string;
  };
  quickStart: {
    eyebrow: string;
    title: string;
    intro: string;
    windowsTitle: string;
    windowsBody: string;
    windowsLabel: string;
    posixTitle: string;
    posixBody: string;
    posixLabel: string;
    copyText: string;
    copiedText: string;
    after: string;
  };
  boundaries: {
    eyebrow: string;
    title: string;
    intro: string;
    items: string[];
  };
  close: {
    title: string;
    body: string;
    install: string;
    source: string;
  };
};

const widthOutputs = {
  wide:
    "agent-terminal-status/docs/research · feature/identity · snowy-atlas",
  medium: "agent-terminal…s/docs/research · snowy-atlas",
  narrow: "agent-termi…ocs/research",
};

export const guides: GuideContent[] = [
  {
    id: "en",
    lang: "en",
    shortLabel: "EN",
    languageName: "English",
    summary: "A calm tour from Claude payload to one trustworthy line.",
    eyebrow: "The field guide",
    title: "A small compass for a terminal full of agents.",
    lede:
      "agent-terminal-status turns fleeting runtime context into a persistent spatial promise: before the next command lands, you can see where it will land.",
    thesis:
      "It is not a dashboard. It is the terminal equivalent of putting a tiny, honest “You are here” dot on the map.",
    journey: {
      eyebrow: "01 · The line’s journey",
      title: "Five careful moves, then quiet.",
      intro:
        "Every refresh starts from Claude Code’s JSON and ends as one measured line. Nothing is cached, phoned home, or guessed from the shell prompt.",
      steps: [
        {
          code: "workspace.current_dir",
          label: "Observe",
          title: "Read the actual working directory",
          body:
            "The adapter prefers Claude Code’s current directory, then uses safe local fallbacks if the payload is incomplete.",
        },
        {
          code: "git -C <cwd>",
          label: "Locate",
          title: "Ask Git about that exact place",
          body:
            "Bounded, read-only calls find the worktree root and branch with optional locks disabled. Each Git subprocess has a default 150 ms deadline.",
        },
        {
          code: "repo/path · branch · host",
          label: "Name",
          title: "Build an honest identity",
          body:
            "With the default ATS_PATH_STYLE=context, paths inside Git are repository-relative and keep the real nested directory. Outside Git, they become home-relative or absolute.",
        },
        {
          code: "Cc · Cf · Cs · Zl · Zp",
          label: "Defuse",
          title: "Remove invisible stage tricks",
          body:
            "Control, format, surrogate, and line-separator characters become spaces, so bidi overrides cannot counterfeit direction or create a second row. Ordinary CJK and emoji variation selectors stay.",
        },
        {
          code: "display width ≤ COLUMNS",
          label: "Fit",
          title: "Render for terminal cells",
          body:
            "CJK-wide characters count as two cells. The path shortens in the middle; in the default auto modes, branch and host leave before location does.",
        },
      ],
    },
    principles: {
      eyebrow: "02 · The design contract",
      title: "Three rules keep the line useful.",
      items: [
        {
          marker: "01",
          title: "The path is the invariant.",
          body:
            "If Git disappears, the branch times out, or hostname lookup fails, the renderer still returns a useful location—never a blank row.",
        },
        {
          marker: "02",
          title: "Optional signals must earn their space.",
          body:
            "Branch and machine help when terminals look alike. Under pressure, they yield to the directory that determines where commands act.",
        },
        {
          marker: "03",
          title: "Uncertainty is rendered honestly.",
          body:
            "The project would rather omit a branch or warn that rollback history is unknown than manufacture a confident but stale answer.",
        },
      ],
    },
    width: {
      eyebrow: "03 · The width theatre",
      title: "Same place. Smaller stage.",
      intro:
        "The renderer measures terminal cells, not raw string length. These are real outputs from the same identity at three widths.",
      cases: [
        {
          columns: "96",
          label: "Full context",
          output: widthOutputs.wide,
          note: "Path, branch, and machine all fit.",
        },
        {
          columns: "44",
          label: "Keep orientation",
          output: widthOutputs.medium,
          note: "Branch leaves; the nested path and machine remain.",
        },
        {
          columns: "24",
          label: "Protect the invariant",
          output: widthOutputs.narrow,
          note: "Only a middle-shortened path survives.",
        },
      ],
      caption:
        "The ellipsis is in the middle on purpose: both the repository beginning and the current-directory ending carry identity.",
    },
    rollback: {
      eyebrow: "04 · A reversible guest",
      title: "Installation borrows one setting. It does not claim the house.",
      intro:
        "The installer treats your existing Claude Code status line as user data, not an obstacle to overwrite.",
      phases: [
        {
          number: "01",
          title: "Inspect",
          body:
            "Parse settings before changing anything. Invalid JSON or an ambiguous existing status line stops the install cleanly.",
        },
        {
          number: "02",
          title: "Preserve",
          body:
            "With explicit force, save the exact previous statusLine value as rollback state. Reinstall keeps that original history while the metadata remains valid.",
        },
        {
          number: "03",
          title: "Write atomically",
          body:
            "Copy only known project files and replace settings through a safe temporary write, reducing the chance of a half-written configuration.",
        },
        {
          number: "04",
          title: "Return carefully",
          body:
            "Uninstall restores the old value only while the active command is still ours. A newer user choice is left untouched.",
        },
      ],
      warningTitle: "When history is damaged, the warning is part of the feature.",
      warningBody:
        "Missing or incomplete rollback metadata is reported as unknown. The uninstaller removes only what it can identify and never prints a fictional “restored” success.",
    },
    privacy: {
      eyebrow: "05 · Quiet also means private",
      title: "Local signals stay local.",
      intro:
        "The render path reads stdin, environment values, the filesystem location, and local Git. That is the entire conversation.",
      facts: [
        {
          title: "No network calls",
          body:
            "Rendering does not contact GitHub, a telemetry endpoint, a package registry, or this website.",
        },
        {
          title: "No analytics or account",
          body:
            "The site has no account backend, application database, or tracking SDK. Its Worker only renders and serves public pages and assets.",
        },
        {
          title: "No decorative dependency stack",
          body:
            "Windows uses PowerShell 5.1 already on the machine; macOS and Linux use Python 3.9+ and the standard library.",
        },
      ],
      aliasTitle: "Screenshots deserve a public name.",
      aliasBody:
        "A hostname can reveal an internal naming convention. Set ATS_MACHINE to a friendly alias, or ATS_SHOW_HOST=never when sharing a screen.",
    },
    quickStart: {
      eyebrow: "06 · Try the compass",
      title: "Clone, install, interact once.",
      intro:
        "The installer updates your user-level Claude Code settings. Claude reloads them automatically; the next interaction refreshes the line.",
      windowsTitle: "Windows",
      windowsBody:
        "PowerShell 5.1+ · no Python, Node.js, jq, icon font, or prompt framework required.",
      windowsLabel: "Copy the Windows installation command",
      posixTitle: "macOS / Linux",
      posixBody: "Python 3.9+ · standard library only.",
      posixLabel: "Copy the macOS and Linux installation command",
      copyText: "Copy",
      copiedText: "Copied",
      after:
        "Already have a status line? Installation stops without changing it. Read the force and uninstall rules before choosing to replace it.",
    },
    boundaries: {
      eyebrow: "07 · What it deliberately does not do",
      title: "A compass is better when it does not pretend to be weather.",
      intro:
        "Version 0.1 stays narrow so its answer remains fast, legible, and trustworthy.",
      items: [
        "It does not report dirty state, ahead/behind, model, context usage, or agent ownership.",
        "Without COLUMNS it uses a 96-cell cap; terminal resize takes effect on the next Claude event rather than forcing a refresh.",
        "It does not promise branch data when local Git exceeds its deadline.",
        "By default, machine identity is the hostname visible inside that environment—not magical SSH, WSL, or container topology detection.",
        "Removing ZWJ and ZWNJ can change the shaping of a complex emoji or connected script; the one-line safety invariant wins.",
        "It cannot make Claude Code show the line during UI states where Claude temporarily hides custom status output.",
      ],
    },
    close: {
      title: "The next command should never be a location quiz.",
      body:
        "Keep one quiet line in view, let the path tell the truth, and spend your attention on the work instead.",
      install: "Jump to quick start",
      source: "Read the technical reference",
    },
  },
  {
    id: "es",
    lang: "es",
    shortLabel: "ES",
    languageName: "Español",
    summary: "Un recorrido sereno desde el JSON de Claude Code hasta una línea confiable.",
    eyebrow: "Guía de campo",
    title: "Una pequeña brújula para un terminal lleno de agentes.",
    lede:
      "agent-terminal-status convierte el contexto fugaz de cada ejecución en una promesa espacial persistente: antes de que llegue el siguiente comando, puedes ver dónde va a actuar.",
    thesis:
      "No es un panel de control. Es el equivalente, dentro del terminal, a colocar un pequeño y sincero «Estás aquí» sobre el mapa.",
    journey: {
      eyebrow: "01 · El viaje de una línea",
      title: "Cinco pasos cuidadosos y, después, silencio.",
      intro:
        "Cada actualización parte del JSON de Claude Code y termina en una sola línea, medida con precisión. Nada se guarda en caché, se comunica al exterior ni se deduce del prompt del shell.",
      steps: [
        {
          code: "workspace.current_dir",
          label: "Observar",
          title: "Leer el directorio de trabajo real",
          body:
            "El adaptador da prioridad al directorio actual que entrega Claude Code y recurre a alternativas locales seguras cuando los datos de entrada están incompletos.",
        },
        {
          code: "git -C <cwd>",
          label: "Ubicar",
          title: "Preguntar a Git por ese lugar exacto",
          body:
            "Llamadas acotadas y de solo lectura localizan la raíz del worktree y la rama, con los bloqueos opcionales desactivados. Cada subproceso de Git tiene un tiempo de espera predeterminado de 150 ms.",
        },
        {
          code: "repo/path · branch · host",
          label: "Nombrar",
          title: "Construir una identidad honesta",
          body:
            "Con el valor predeterminado ATS_PATH_STYLE=context, las rutas dentro de Git son relativas al repositorio y conservan el directorio anidado real. Fuera de Git se muestran relativas al directorio personal o como rutas absolutas.",
        },
        {
          code: "Cc · Cf · Cs · Zl · Zp",
          label: "Neutralizar",
          title: "Quitar los trucos invisibles del escenario",
          body:
            "Los caracteres de control, formato, sustitutos (surrogates) y separadores de línea se convierten en espacios, de modo que un control de anulación bidi no pueda falsificar la dirección ni crear una segunda línea. Los caracteres CJK normales y los selectores de variación de emoji se conservan.",
        },
        {
          code: "display width ≤ COLUMNS",
          label: "Encajar",
          title: "Renderizar según las celdas del terminal",
          body:
            "Los caracteres CJK anchos cuentan como dos celdas. La ruta se acorta por el centro; con la configuración automática predeterminada, la rama y la identidad de la máquina ceden su sitio antes que la ubicación.",
        },
      ],
    },
    principles: {
      eyebrow: "02 · El contrato de diseño",
      title: "Tres reglas mantienen útil la línea.",
      items: [
        {
          marker: "01",
          title: "La ruta es el invariante.",
          body:
            "Si Git no está disponible, una consulta a Git agota su tiempo de espera o falla la consulta del nombre del equipo, el renderizador sigue devolviendo una ubicación útil: nunca una línea en blanco.",
        },
        {
          marker: "02",
          title: "Las señales opcionales deben merecer su espacio.",
          body:
            "La rama y la identidad de la máquina ayudan a distinguir terminales parecidos. Cuando falta espacio, ceden ante el directorio que determina dónde actúan los comandos.",
        },
        {
          marker: "03",
          title: "La incertidumbre se muestra con honestidad.",
          body:
            "El proyecto prefiere omitir una rama o advertir que se desconoce el historial de reversión antes que inventar una respuesta categórica pero obsoleta.",
        },
      ],
    },
    width: {
      eyebrow: "03 · El teatro del ancho",
      title: "Mismo lugar. Escenario más pequeño.",
      intro:
        "El renderizador mide celdas del terminal, no la longitud bruta de la cadena. Estas son salidas reales de una misma identidad con tres anchos distintos.",
      cases: [
        {
          columns: "96",
          label: "Contexto completo",
          output: widthOutputs.wide,
          note: "Hay espacio para la ruta, la rama y la identidad de la máquina.",
        },
        {
          columns: "44",
          label: "Conservar la orientación",
          output: widthOutputs.medium,
          note: "La rama se retira; la ruta anidada y la identidad de la máquina permanecen.",
        },
        {
          columns: "24",
          label: "Proteger el invariante",
          output: widthOutputs.narrow,
          note: "Solo sobrevive la ruta acortada por el centro.",
        },
      ],
      caption:
        "Los puntos suspensivos están en el centro a propósito: tanto el inicio, que identifica el repositorio, como el final, que identifica el directorio actual, aportan identidad.",
    },
    rollback: {
      eyebrow: "04 · Un huésped reversible",
      title: "La instalación toma prestado un ajuste. No se adueña de la casa.",
      intro:
        "El instalador trata el valor actual de statusLine en la configuración de Claude Code como datos del usuario, no como un obstáculo que deba sobrescribir.",
      phases: [
        {
          number: "01",
          title: "Inspeccionar",
          body:
            "Analiza la configuración antes de cambiar nada. Un JSON inválido o una línea de estado existente de procedencia ambigua detienen la instalación sin modificar nada.",
        },
        {
          number: "02",
          title: "Conservar",
          body:
            "Solo al usar de forma explícita la opción de forzado (-Force en Windows o --force en macOS y Linux) se guarda como estado de reversión el valor anterior exacto de statusLine. Una reinstalación conserva ese historial original mientras los metadatos sigan siendo válidos.",
        },
        {
          number: "03",
          title: "Escribir de forma atómica",
          body:
            "Copia únicamente los archivos conocidos del proyecto y sustituye la configuración mediante una escritura temporal segura, lo que reduce el riesgo de dejarla incompleta.",
        },
        {
          number: "04",
          title: "Restaurar con cuidado",
          body:
            "El desinstalador restaura el valor anterior solo si el comando activo sigue siendo el nuestro. Una elección posterior del usuario queda intacta.",
        },
      ],
      warningTitle: "Si el historial está dañado, avisar también forma parte del diseño.",
      warningBody:
        "Si faltan metadatos de reversión o están incompletos, el estado anterior se declara desconocido. El desinstalador elimina solo aquello que puede identificar y jamás anuncia una restauración ficticia.",
    },
    privacy: {
      eyebrow: "05 · El silencio también significa privacidad",
      title: "Las señales locales permanecen en tu equipo.",
      intro:
        "La ruta de renderizado solo lee stdin, valores del entorno, la ubicación en el sistema de archivos y Git local. Ahí termina toda la conversación.",
      facts: [
        {
          title: "Sin llamadas de red",
          body:
            "El renderizado no contacta con GitHub, servicios de telemetría, registros de paquetes ni este sitio web.",
        },
        {
          title: "Sin analítica ni cuentas",
          body:
            "El sitio no tiene backend de cuentas, base de datos de la aplicación ni SDK de seguimiento. Su Worker se limita a renderizar y servir páginas y recursos públicos.",
        },
        {
          title: "Sin una pila decorativa de dependencias",
          body:
            "Windows usa el PowerShell 5.1 que ya está en el sistema; macOS y Linux usan Python 3.9+ y la biblioteca estándar.",
        },
      ],
      aliasTitle: "Las capturas merecen un nombre que se pueda compartir.",
      aliasBody:
        "Un nombre de host puede revelar convenciones internas de nombres. Define ATS_MACHINE con un alias reconocible o usa ATS_SHOW_HOST=never al compartir la pantalla.",
    },
    quickStart: {
      eyebrow: "06 · Prueba la brújula",
      title: "Clona, instala e interactúa una vez.",
      intro:
        "El instalador actualiza la configuración de Claude Code a nivel de usuario. Claude la vuelve a cargar automáticamente; la siguiente interacción actualiza la línea.",
      windowsTitle: "Windows",
      windowsBody:
        "PowerShell 5.1+ · no requiere Python, Node.js, jq, fuentes de iconos ni un framework para personalizar el prompt.",
      windowsLabel: "Copiar el comando de instalación para Windows",
      posixTitle: "macOS / Linux",
      posixBody: "Python 3.9+ · solo la biblioteca estándar.",
      posixLabel: "Copiar el comando de instalación para macOS y Linux",
      copyText: "Copiar",
      copiedText: "Copiado",
      after:
        "¿Ya tienes una línea de estado? La instalación se detiene sin cambiarla. Lee las reglas de instalación forzada y desinstalación antes de decidir sustituirla.",
    },
    boundaries: {
      eyebrow: "07 · Lo que deliberadamente no hace",
      title: "Una brújula funciona mejor cuando no pretende dar el pronóstico del tiempo.",
      intro:
        "La versión 0.1 se ciñe a un alcance reducido para mantener una respuesta rápida, legible y confiable.",
      items: [
        "No muestra cambios pendientes (dirty), divergencia ahead/behind, el modelo, el uso del contexto ni qué agente está a cargo.",
        "Sin COLUMNS aplica un límite de 96 celdas; un cambio de tamaño del terminal se refleja en el siguiente evento de Claude en lugar de forzar una actualización.",
        "No promete información de la rama cuando una consulta a Git local agota su tiempo de espera.",
        "De forma predeterminada, la identidad de la máquina es el nombre de host visible dentro de ese entorno, no una detección mágica de la topología de SSH, WSL o contenedores.",
        "Eliminar ZWJ y ZWNJ puede alterar la forma de un emoji complejo o de un sistema de escritura con caracteres enlazados; prevalece el invariante de seguridad de una sola línea.",
        "No puede obligar a Claude Code a mostrar la línea en los estados de la interfaz donde Claude oculta temporalmente la línea de estado personalizada.",
      ],
    },
    close: {
      title: "El siguiente comando nunca debería ser un acertijo sobre tu ubicación.",
      body:
        "Mantén una línea serena a la vista, deja que la ruta diga la verdad y reserva tu atención para el trabajo.",
      install: "Ir al inicio rápido",
      source: "Leer la referencia técnica",
    },
  },
  {
    id: "ja",
    lang: "ja",
    shortLabel: "JA",
    languageName: "日本語",
    summary: "Claude の入力から、信頼できる一行が生まれるまで。",
    eyebrow: "フィールドガイド",
    title: "エージェントが行き交うターミナルに、小さな羅針盤を。",
    lede:
      "agent-terminal-status は、その場限りの実行コンテキストを、いつでも見える「現在地」に変えます。次のコマンドを打つ前に、それがどこへ届くのかが分かります。",
    thesis:
      "これはダッシュボードではありません。地図の隅に、正直な「現在地」をひとつ置くための道具です。",
    journey: {
      eyebrow: "01 · 一行ができるまで",
      title: "五つの慎重な動作。そのあとは静かに。",
      intro:
        "更新のたびに Claude Code の JSON から始まり、幅を測った一行で終わります。キャッシュも外部通信も、シェルプロンプトからの推測もありません。",
      steps: [
        {
          code: "workspace.current_dir",
          label: "観測",
          title: "本当に使われている作業ディレクトリを読む",
          body:
            "まず Claude Code が渡す現在のディレクトリを使い、入力が欠けているときだけ安全なローカル情報へフォールバックします。",
        },
        {
          code: "git -C <cwd>",
          label: "照合",
          title: "その場所について Git にだけ尋ねる",
          body:
            "GIT_OPTIONAL_LOCKS=0 として、実行時間を制限した読み取り専用の Git 呼び出しで worktree のルートと branch を調べます。各 subprocess は既定で 150 ms を超えると打ち切ります。",
        },
        {
          code: "repo/path · branch · host",
          label: "命名",
          title: "正直な現在地を組み立てる",
          body:
            "既定の ATS_PATH_STYLE=context では、Git 内の path をリポジトリ相対で表示し、実際の深い作業場所まで残します。Git 外ではホーム相対、できなければ絶対 path です。",
        },
        {
          code: "Cc · Cf · Cs · Zl · Zp",
          label: "無害化",
          title: "見えない舞台装置を外す",
          body:
            "制御・書式・サロゲート・改行区切り文字を空白に置き換え、bidi override に向きや行数を偽装させません。通常の CJK と emoji variation selector は残します。",
        },
        {
          code: "display width ≤ COLUMNS",
          label: "整形",
          title: "文字数ではなく、ターミナルのセル幅に収める",
          body:
            "全角 CJK は 2 cell と数えます。path は中央で短縮し、既定の auto モードでは branch と host が現在地より先に退場します。",
        },
      ],
    },
    principles: {
      eyebrow: "02 · 設計の約束",
      title: "役に立つ一行を守る、三つの原則。",
      items: [
        {
          marker: "01",
          title: "path は最後まで残す。",
          body:
            "Git がなくても、branch が timeout しても、hostname の取得に失敗しても、場所だけは返します。空行にはしません。",
        },
        {
          marker: "02",
          title: "補助情報は、幅に見合うときだけ。",
          body:
            "branch と machine は似たターミナルを見分ける助けになります。ただし狭くなれば、コマンドの作用先を示す directory に席を譲ります。",
        },
        {
          marker: "03",
          title: "分からないことを、分かったふりにしない。",
          body:
            "古い情報を自信満々に出すくらいなら、branch を省き、rollback 履歴が不明ならそう警告します。",
        },
      ],
    },
    width: {
      eyebrow: "03 · 幅のシアター",
      title: "場所は同じ。舞台だけが小さくなる。",
      intro:
        "測っているのは文字列の長さではなく terminal cell です。下は、同じ identity を三つの幅で実際に描画した結果です。",
      cases: [
        {
          columns: "96",
          label: "すべて表示",
          output: widthOutputs.wide,
          note: "path・branch・machine が全部入ります。",
        },
        {
          columns: "44",
          label: "方向感覚を優先",
          output: widthOutputs.medium,
          note: "branch が退き、深い path と machine が残ります。",
        },
        {
          columns: "24",
          label: "不変条件を守る",
          output: widthOutputs.narrow,
          note: "中央を縮めた path だけが残ります。",
        },
      ],
      caption:
        "省略記号が中央にあるのは意図的です。リポジトリを示す先頭と、現在の directory を示す末尾の両方が大切だからです。",
    },
    rollback: {
      eyebrow: "04 · 元に戻せる訪問者",
      title: "設定をひとつ借りても、家ごと自分のものにはしない。",
      intro:
        "installer は既存の Claude Code status line を、上書きすべき障害ではなく大切な user data として扱います。",
      phases: [
        {
          number: "01",
          title: "確認する",
          body:
            "変更前に settings を parse します。不正な JSON や判断できない既存設定があれば、何も変えずに止まります。",
        },
        {
          number: "02",
          title: "保存する",
          body:
            "明示的に force した場合だけ、以前の statusLine をそのまま rollback state に保存します。metadata が有効な間は、再 install でも最初の履歴を守ります。",
        },
        {
          number: "03",
          title: "atomic に書く",
          body:
            "既知の project file だけをコピーし、安全な一時書き込みを経て settings を置き換えます。中途半端な設定を残しにくくします。",
        },
        {
          number: "04",
          title: "慎重に返す",
          body:
            "uninstall は active command がまだ本 project のものなら旧設定を復元します。その後の user の選択には触れません。",
        },
      ],
      warningTitle: "履歴が壊れているなら、警告すること自体が機能です。",
      warningBody:
        "rollback metadata が欠落・不完全なら「不明」と伝えます。識別できるものだけを削除し、架空の「復元しました」は表示しません。",
    },
    privacy: {
      eyebrow: "05 · 静かさは、プライバシーでもある。",
      title: "ローカルの情報は、ローカルに。",
      intro:
        "描画経路が読むのは stdin、environment、filesystem 上の場所、そして local Git。それで会話は終わりです。",
      facts: [
        {
          title: "network call なし",
          body:
            "GitHub、telemetry endpoint、package registry、この website のどれにも描画中は接続しません。",
        },
        {
          title: "analytics も account もなし",
          body:
            "サイトにはアカウント用バックエンド、アプリケーションデータベース、トラッキング SDK はありません。Worker は公開ページとアセットの描画・配信だけを担います。",
        },
        {
          title: "飾りのための dependency stack なし",
          body:
            "Windows は標準の PowerShell 5.1、macOS / Linux は Python 3.9+ と standard library だけを使います。",
        },
      ],
      aliasTitle: "画面共有には、公開してよい名前を。",
      aliasBody:
        "hostname は社内の命名規則を漏らすことがあります。ATS_MACHINE に親しみやすい alias を設定するか、共有時は ATS_SHOW_HOST=never を使えます。",
    },
    quickStart: {
      eyebrow: "06 · 羅針盤を試す",
      title: "クローンしてインストールし、一度操作するだけ。",
      intro:
        "installer は user-level の Claude Code settings を更新します。Claude が自動で読み直し、次の操作で一行が更新されます。",
      windowsTitle: "Windows",
      windowsBody:
        "PowerShell 5.1+ · Python、Node.js、jq、icon font、prompt framework は不要です。",
      windowsLabel: "Windows の install command をコピー",
      posixTitle: "macOS / Linux",
      posixBody: "Python 3.9+ · standard library のみ。",
      posixLabel: "macOS / Linux の install command をコピー",
      copyText: "コピー",
      copiedText: "コピー済み",
      after:
        "既存の status line があれば、何も変えずに停止します。置き換える前に force と uninstall の規則を確認してください。",
    },
    boundaries: {
      eyebrow: "07 · あえて、しないこと",
      title: "羅針盤は、天気予報のふりをしない方がいい。",
      intro:
        "Version 0.1 は答えを速く、読みやすく、信頼できるままにするため、役割を絞っています。",
      items: [
        "dirty state、ahead/behind、model、context 使用量、agent ownership は表示しません。",
        "COLUMNS がなければ 96 cell を上限にします。terminal resize は強制更新せず、次の Claude event で反映します。",
        "local Git が期限を超えたとき、branch 情報があるふりをしません。",
        "machine identity の既定値はその環境から見える hostname であり、SSH・WSL・container の構成を魔法のように判別するものではありません。",
        "ZWJ / ZWNJ の除去で複雑な emoji や連結文字の形が変わることがあります。一行の安全性を優先するための取捨選択です。",
        "Claude Code 自身が custom status を一時的に隠す UI state では、表示を強制できません。",
      ],
    },
    close: {
      title: "次のコマンドを、現在地クイズにしない。",
      body:
        "静かな一行を視界に置き、path に事実を語らせて、注意力は本来の作業に使いましょう。",
      install: "quick start へ",
      source: "技術リファレンスを読む",
    },
  },
  {
    id: "zh-hant",
    lang: "zh-Hant",
    shortLabel: "繁",
    languageName: "繁體中文",
    summary: "從 Claude 輸入，到一行可信的工作位置。",
    eyebrow: "實地指南",
    title: "讓 AI agents 來來往往的終端機，也有一枚小小的指南針。",
    lede:
      "agent-terminal-status 把轉瞬即逝的執行脈絡，變成持續可見的空間承諾：下一個命令落下之前，你先知道它會落在哪裡。",
    thesis:
      "它不是儀表板，而是終端機地圖上那個小而誠實的「你在這裡」。",
    journey: {
      eyebrow: "01 · 一行文字的旅程",
      title: "五個謹慎步驟，然後安靜下來。",
      intro:
        "每次更新都從 Claude Code 的 JSON 開始，以一行量好寬度的文字結束。不快取、不連外，也不從 shell prompt 猜測。",
      steps: [
        {
          code: "workspace.current_dir",
          label: "觀察",
          title: "讀取真正的工作目錄",
          body:
            "adapter 優先採用 Claude Code 傳入的目前目錄；只有 payload 不完整時，才退回安全的本機資訊。",
        },
        {
          code: "git -C <cwd>",
          label: "定位",
          title: "只向 Git 詢問這個確切位置",
          body:
            "停用 optional locks，再以有界、唯讀的呼叫找出 worktree root 與 branch；每個 Git subprocess 的預設 deadline 是 150 ms。",
        },
        {
          code: "repo/path · branch · host",
          label: "命名",
          title: "組合誠實的 identity",
          body:
            "在預設的 ATS_PATH_STYLE=context 下，Git 內採 repository-relative path，保留真正的巢狀目錄；在 Git 外則顯示 home-relative 或 absolute path。",
        },
        {
          code: "Cc · Cf · Cs · Zl · Zp",
          label: "拆彈",
          title: "移除看不見的舞台機關",
          body:
            "控制、格式、surrogate 與行分隔字元會變成空格，讓 bidi override 無法偽造方向或偷偷長出第二行；一般 CJK 與 emoji variation selector 仍會保留。",
        },
        {
          code: "display width ≤ COLUMNS",
          label: "入鏡",
          title: "用 terminal cell，而不是字串長度排版",
          body:
            "全形 CJK 字元計為兩格。path 從中間縮短；在預設的 auto 模式下，空間不足時 branch 與 host 會先讓位給工作位置。",
        },
      ],
    },
    principles: {
      eyebrow: "02 · 設計契約",
      title: "三條規則，守住這一行的價值。",
      items: [
        {
          marker: "01",
          title: "Path 是不可犧牲的不變式。",
          body:
            "Git 消失、branch 逾時、hostname 解析失敗時，renderer 仍會留下有用的位置，永遠不交出空白行。",
        },
        {
          marker: "02",
          title: "附加訊號必須值得它佔用的寬度。",
          body:
            "branch 與 machine 能辨認相似的終端機；空間緊張時，它們必須讓位給真正決定命令作用範圍的 directory。",
        },
        {
          marker: "03",
          title: "不知道，就明白說不知道。",
          body:
            "與其自信地展示過期資訊，專案寧可省略 branch；rollback 歷史無法確認時，也只會誠實警告。",
        },
      ],
    },
    width: {
      eyebrow: "03 · 欄寬劇場",
      title: "位置沒變，只是舞台縮小了。",
      intro:
        "renderer 計算的是 terminal cell，不是原始字串長度。以下是同一組 identity 在三種寬度下的真實輸出。",
      cases: [
        {
          columns: "96",
          label: "完整脈絡",
          output: widthOutputs.wide,
          note: "path、branch、machine 全部容得下。",
        },
        {
          columns: "44",
          label: "方向感優先",
          output: widthOutputs.medium,
          note: "branch 退場，巢狀 path 與 machine 留下。",
        },
        {
          columns: "24",
          label: "守住不變式",
          output: widthOutputs.narrow,
          note: "只保留從中間縮短的 path。",
        },
      ],
      caption:
        "省略號刻意放在中間：開頭告訴你是哪個 repository，結尾告訴你目前在哪個 directory，兩端都值得保留。",
    },
    rollback: {
      eyebrow: "04 · 一位可逆的房客",
      title: "借用一項設定，不代表接管整棟房子。",
      intro:
        "installer 把你原有的 Claude Code status line 視為 user data，而不是等著被覆寫的障礙。",
      phases: [
        {
          number: "01",
          title: "先檢查",
          body:
            "變更前先 parse settings。JSON 無效或既有 status line 歸屬不明時，完全不修改就停止。",
        },
        {
          number: "02",
          title: "保留舊值",
          body:
            "只有明確使用 force 時，才把舊 statusLine 原樣儲存為 rollback state；metadata 有效時，重新安裝也保留最初那份歷史。",
        },
        {
          number: "03",
          title: "原子寫入",
          body:
            "只複製專案已知檔案，並透過安全的暫存寫入替換 settings，降低留下半份設定的風險。",
        },
        {
          number: "04",
          title: "小心歸還",
          body:
            "uninstall 只在 active command 仍屬於本專案時復原舊值；使用者後來做的新選擇一律不碰。",
        },
      ],
      warningTitle: "歷史損壞時，警告本身就是功能。",
      warningBody:
        "rollback metadata 缺失或不完整，就明說狀態未知。uninstaller 只移除能確定的項目，絕不虛構一句「已成功還原」。",
    },
    privacy: {
      eyebrow: "05 · 安靜，也代表隱私",
      title: "留在本機的訊號，就讓它留在本機。",
      intro:
        "render path 只讀 stdin、environment、filesystem 位置與 local Git。對話到此為止。",
      facts: [
        {
          title: "沒有 network call",
          body:
            "rendering 不會聯絡 GitHub、telemetry endpoint、package registry，甚至不會聯絡這個網站。",
        },
        {
          title: "沒有 analytics，也沒有 account",
          body:
            "網站沒有帳號後端、應用程式資料庫或 tracking SDK；Worker 只負責呈現並遞送公開頁面與資產。",
        },
        {
          title: "沒有只為裝飾而堆疊的相依套件",
          body:
            "Windows 使用系統既有的 PowerShell 5.1；macOS / Linux 使用 Python 3.9+ 與 standard library。",
        },
      ],
      aliasTitle: "要截圖，就先取一個可以公開的名字。",
      aliasBody:
        "hostname 可能透露內部命名規則。可將 ATS_MACHINE 設為友善 alias，或在分享畫面時使用 ATS_SHOW_HOST=never。",
    },
    quickStart: {
      eyebrow: "06 · 試試這枚指南針",
      title: "Clone、安裝，互動一次。",
      intro:
        "installer 會更新使用者層級的 Claude Code settings。Claude 會自動重新載入；下一次互動就會更新這一行。",
      windowsTitle: "Windows",
      windowsBody:
        "PowerShell 5.1+ · 不需要 Python、Node.js、jq、icon font 或 prompt framework。",
      windowsLabel: "複製 Windows 安裝命令",
      posixTitle: "macOS / Linux",
      posixBody: "Python 3.9+ · 只使用 standard library。",
      posixLabel: "複製 macOS / Linux 安裝命令",
      copyText: "複製",
      copiedText: "已複製",
      after:
        "已經有 status line？安裝程式會原封不動地停下。決定取代之前，請先閱讀 force 與 uninstall 規則。",
    },
    boundaries: {
      eyebrow: "07 · 刻意不做的事",
      title: "指南針不假裝自己是氣象站，反而更可靠。",
      intro:
        "Version 0.1 刻意維持精簡，讓答案繼續快速、清楚、可信。",
      items: [
        "不顯示 dirty state、ahead/behind、model、context 用量或 agent ownership。",
        "缺少 COLUMNS 時採 96 個 terminal cell 上限；terminal resize 不強制更新，而是在下一個 Claude event 生效。",
        "local Git 超過 deadline 時，不假裝擁有 branch 資訊。",
        "machine identity 的預設值是該環境能看見的 hostname，不會神奇地判讀 SSH、WSL 或 container 拓樸。",
        "移除 ZWJ / ZWNJ 可能改變複雜 emoji 或連寫文字的外觀；這是為了守住單行安全性所做的取捨。",
        "Claude Code 在特定 UI 狀態暫時隱藏 custom status 時，本專案無法強迫它顯示。",
      ],
    },
    close: {
      title: "別讓下一個命令，變成一場工作位置猜謎。",
      body:
        "保留一行安靜的提示，讓 path 說實話，把注意力留給真正值得處理的工作。",
      install: "前往快速開始",
      source: "閱讀技術參考",
    },
  },
];
