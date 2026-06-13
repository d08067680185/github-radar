import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Editor's Picks · 20 Most Valuable Open-Source Projects",
  description:
    "A hand-curated list of the 20 most valuable open-source projects on GitHub — judged by how indispensable they are to the rest of the software world, not by star count.",
};

type Pick = {
  owner: string;
  name: string;
  emoji: string;
  display: string;
  // bilingual fields
  tagZh: string;
  tagEn: string;
  introZh: string;
  introEn: string;
  reasonZh: string;
  reasonEn: string;
};

type Tier = {
  keyZh: string;
  keyEn: string;
  blurbZh: string;
  blurbEn: string;
  picks: Pick[];
};

const TIERS: Tier[] = [
  {
    keyZh: "运行世界的地基",
    keyEn: "The Foundations That Run the World",
    blurbZh: "这些项目本身就是「计算」的底座——操作系统、版本控制、编程语言运行时。它们一旦消失，几乎所有其他软件都无从谈起。",
    blurbEn: "These are the substrate of computing itself — operating systems, version control, language runtimes. If any of them vanished, almost everything else would stop existing.",
    picks: [
      {
        owner: "torvalds", name: "linux", emoji: "🐧", display: "Linux Kernel",
        tagZh: "操作系统内核", tagEn: "OS kernel",
        introZh: "Linus Torvalds 于 1991 年发起的操作系统内核，如今驱动着全球绝大多数服务器、所有 Android 手机、几乎全部云计算与超算、以及无数嵌入式设备。它是人类历史上协作规模最大的软件工程之一，每个版本由上千名开发者贡献。",
        introEn: "The operating-system kernel Linus Torvalds started in 1991. Today it powers the overwhelming majority of the world's servers, every Android phone, nearly all cloud and supercomputing, and countless embedded devices. It is one of the largest collaborative engineering efforts in human history, with thousands of contributors per release.",
        reasonZh: "现代数字世界的字面意义上的地基。没有任何单一开源项目比它影响更广、依赖更深——互联网的物理层就跑在它上面。",
        reasonEn: "The literal bedrock of the modern digital world. No single open-source project has wider reach or deeper dependency — the physical layer of the internet runs on it.",
      },
      {
        owner: "git", name: "git", emoji: "🔀", display: "Git",
        tagZh: "分布式版本控制", tagEn: "version control",
        introZh: "同样出自 Torvalds 之手（为管理 Linux 内核而生），Git 重新定义了人类协作写代码的方式。分布式模型让每个克隆都是完整仓库，分支廉价到可以随手开。GitHub、GitLab 乃至本站本身，都建立在它之上。",
        introEn: "Also from Torvalds (built to manage the Linux kernel itself), Git redefined how humans collaborate on code. Its distributed model makes every clone a full repository and branching nearly free. GitHub, GitLab — and this very site — are all built on top of it.",
        reasonZh: "它是开源协作的「通用语」。整个 GitHub 生态、几乎所有软件团队的日常工作流，都以它为前提。",
        reasonEn: "The lingua franca of open-source collaboration. The entire GitHub ecosystem and nearly every software team's daily workflow presuppose it.",
      },
      {
        owner: "python", name: "cpython", emoji: "🐍", display: "Python (CPython)",
        tagZh: "编程语言", tagEn: "language",
        introZh: "Python 的官方参考实现。凭借极低的入门门槛和「胶水语言」的万能性，Python 成为数据科学、AI/ML、自动化、科研与教学的事实标准语言。当今的 AI 革命几乎全部用 Python 写成。",
        introEn: "The official reference implementation of Python. With its gentle learning curve and 'glue language' versatility, Python became the de facto language of data science, AI/ML, automation, research, and education. Today's AI revolution is written almost entirely in Python.",
        reasonZh: "它是把数百万非专业程序员、科学家和研究者带进编程世界的桥梁，也是 AI 时代的母语。",
        reasonEn: "The bridge that brought millions of non-professional programmers, scientists, and researchers into coding — and the mother tongue of the AI era.",
      },
      {
        owner: "nodejs", name: "node", emoji: "🟢", display: "Node.js",
        tagZh: "JavaScript 运行时", tagEn: "JS runtime",
        introZh: "把 JavaScript 从浏览器解放出来、带到服务器端的运行时。它催生了 npm——世界上最大的软件包生态系统，让前后端可以共用一门语言，深刻塑造了过去十余年的 Web 开发格局。",
        introEn: "The runtime that freed JavaScript from the browser and brought it to the server. It gave rise to npm — the world's largest package ecosystem — and let teams share one language across front and back end, profoundly shaping Web development for over a decade.",
        reasonZh: "它统一了 Web 全栈的语言，npm 生态的体量本身就是其价值的证明。",
        reasonEn: "It unified the language of full-stack Web development; the sheer scale of the npm ecosystem is itself the proof of its value.",
      },
      {
        owner: "golang", name: "go", emoji: "🐹", display: "Go",
        tagZh: "编程语言", tagEn: "language",
        introZh: "Google 设计的系统编程语言，主打简洁、快速编译和一流的并发支持（goroutine）。它已成为云原生基础设施的默认语言——Docker、Kubernetes、Prometheus 等众多关键项目都用 Go 写成。",
        introEn: "Google's systems language, prized for simplicity, fast compilation, and first-class concurrency (goroutines). It has become the default language of cloud-native infrastructure — Docker, Kubernetes, Prometheus, and many other critical projects are written in Go.",
        reasonZh: "现代云基础设施的「官方方言」。你每天依赖的云服务，底层很可能就是 Go。",
        reasonEn: "The official dialect of modern cloud infrastructure. The cloud services you rely on every day are very likely Go underneath.",
      },
      {
        owner: "rust-lang", name: "rust", emoji: "🦀", display: "Rust",
        tagZh: "编程语言", tagEn: "language",
        introZh: "用编译期所有权与借用检查在「不要垃圾回收」的前提下保证内存安全的系统语言。它正在被引入 Linux 内核、Windows 与 Android 的核心组件，连续多年被开发者票选为「最受喜爱的语言」。",
        introEn: "A systems language that guarantees memory safety without a garbage collector, via compile-time ownership and borrow checking. It is being adopted into the Linux kernel and core components of Windows and Android, and has topped 'most loved language' surveys for years running.",
        reasonZh: "它代表系统编程的未来方向——在 C/C++ 把持数十年的领域，提供了安全性的范式级升级。",
        reasonEn: "It represents the future of systems programming — a paradigm-level safety upgrade in a domain C/C++ dominated for decades.",
      },
    ],
  },
  {
    keyZh: "云与数据的基座",
    keyEn: "The Cloud & Data Backbone",
    blurbZh: "现代应用不是跑在某台机器上，而是跑在「云」这套抽象之上。这一梯队是支撑起规模化部署、存储与流量的核心组件。",
    blurbEn: "Modern applications don't run on a machine — they run on the abstraction we call 'the cloud.' This tier holds the core components that make deployment, storage, and traffic work at scale.",
    picks: [
      {
        owner: "kubernetes", name: "kubernetes", emoji: "☸️", display: "Kubernetes",
        tagZh: "容器编排", tagEn: "orchestration",
        introZh: "源自 Google 内部 Borg 系统的容器编排平台，已成为云原生计算的事实标准。它把「在一群机器上调度、扩缩、自愈成千上万个容器」这件极难的事变成了声明式配置，是整个 CNCF 生态的核心。",
        introEn: "A container-orchestration platform born from Google's internal Borg system, now the de facto standard of cloud-native computing. It turns the extremely hard problem of scheduling, scaling, and self-healing thousands of containers across a fleet of machines into declarative config — the heart of the entire CNCF ecosystem.",
        reasonZh: "它定义了「云原生」这个词。今天几乎所有大规模线上服务的部署方式，都绕不开它。",
        reasonEn: "It defined the term 'cloud-native.' Almost every large-scale online service's deployment story runs through it today.",
      },
      {
        owner: "moby", name: "moby", emoji: "🐳", display: "Docker (Moby)",
        tagZh: "容器化", tagEn: "containerization",
        introZh: "Docker 把「容器」从一项小众内核特性变成了人人可用的开发体验，彻底改变了软件的打包、分发与运行方式。「在我机器上能跑」从此不再是借口——镜像让环境可复现。Moby 是其上游开源项目。",
        introEn: "Docker turned 'containers' from a niche kernel feature into an everyday developer experience, fundamentally changing how software is packaged, shipped, and run. 'Works on my machine' stopped being an excuse — images made environments reproducible. Moby is its upstream open-source project.",
        reasonZh: "它发明了现代软件交付的标准单元。没有容器，就没有今天的 DevOps 与微服务。",
        reasonEn: "It invented the standard unit of modern software delivery. Without containers, there is no modern DevOps or microservices.",
      },
      {
        owner: "redis", name: "redis", emoji: "🧠", display: "Redis",
        tagZh: "内存数据存储", tagEn: "in-memory store",
        introZh: "极速的内存数据结构存储，可用作缓存、消息队列、会话存储和实时排行榜。亚毫秒级的延迟让它成为几乎每一个高并发系统的标配组件——本站的榜单缓存与限流也都用它。",
        introEn: "A blazing-fast in-memory data-structure store used as cache, message queue, session store, and real-time leaderboard. Sub-millisecond latency makes it a standard component of nearly every high-concurrency system — including this site's ranking cache and rate limiting.",
        reasonZh: "它是「让网站变快」的默认答案，渗透到无数后端架构的毛细血管里。",
        reasonEn: "It's the default answer to 'make the site fast,' threaded through the capillaries of countless backend architectures.",
      },
      {
        owner: "postgres", name: "postgres", emoji: "🐘", display: "PostgreSQL",
        tagZh: "关系型数据库", tagEn: "relational DB",
        introZh: "被广泛认为是世界上最先进的开源关系型数据库。以严格的可靠性、对 SQL 标准的忠实、丰富的扩展能力（JSON、地理空间、向量检索）著称，是无数严肃应用存放核心数据的首选。本站也用它。",
        introEn: "Widely regarded as the world's most advanced open-source relational database. Known for rock-solid reliability, faithful SQL-standard compliance, and rich extensibility (JSON, geospatial, vector search), it's the first choice for storing the core data of countless serious applications — this site included.",
        reasonZh: "在「把数据安全可靠地存好」这件最不可妥协的事上，它是开源世界的黄金标准。",
        reasonEn: "On the most non-negotiable job — storing data safely and reliably — it is the open-source gold standard.",
      },
      {
        owner: "nginx", name: "nginx", emoji: "🌐", display: "NGINX",
        tagZh: "Web 服务器 / 反向代理", tagEn: "web server / proxy",
        introZh: "高性能的 Web 服务器、反向代理与负载均衡器，以事件驱动架构在海量并发连接下依旧轻量稳定。互联网上极大比例的网站都由它在前端承接流量——本站线上同样靠它做 TLS 终止与反代。",
        introEn: "A high-performance web server, reverse proxy, and load balancer whose event-driven architecture stays light and stable under massive concurrent connections. A very large share of websites on the internet are fronted by it — including this site's production TLS termination and reverse proxy.",
        reasonZh: "它是互联网流量的「门卫」，安静地站在无数网站的最前线。",
        reasonEn: "It's the gatekeeper of internet traffic, quietly standing at the front line of countless websites.",
      },
    ],
  },
  {
    keyZh: "开发者每天打交道的工具",
    keyEn: "What Developers Touch Every Day",
    blurbZh: "这一梯队直接塑造了「写代码」与「做产品」的日常手感，定义了一代开发者的工作方式与审美。",
    blurbEn: "This tier directly shapes the daily feel of writing code and building products, defining how — and how elegantly — a generation of developers works.",
    picks: [
      {
        owner: "microsoft", name: "vscode", emoji: "📝", display: "VS Code",
        tagZh: "代码编辑器", tagEn: "code editor",
        introZh: "微软开源的代码编辑器，凭借速度、海量扩展生态和优雅的体验，成为全球使用最广的开发工具。它也间接推动了 Language Server Protocol（LSP）这一影响深远的标准，让「智能补全」在所有编辑器间通用。",
        introEn: "Microsoft's open-source code editor, which became the most widely used development tool in the world thanks to its speed, vast extension ecosystem, and polished experience. It also drove the Language Server Protocol (LSP), a far-reaching standard that made 'smart completion' portable across every editor.",
        reasonZh: "它是绝大多数开发者每天盯着的那块屏幕，并重塑了编辑器的行业标准。",
        reasonEn: "It's the screen most developers stare at all day, and it reset the industry standard for editors.",
      },
      {
        owner: "facebook", name: "react", emoji: "⚛️", display: "React",
        tagZh: "前端 UI 库", tagEn: "front-end UI",
        introZh: "Facebook 开源的 UI 库，用「组件化 + 声明式」彻底改变了前端开发的思维方式。虚拟 DOM、单向数据流、Hooks 等理念被整个行业吸收，催生了庞大的生态（Next.js、React Native 等）。",
        introEn: "Facebook's UI library, which transformed front-end thinking with a 'component-based + declarative' model. Ideas like the virtual DOM, one-way data flow, and Hooks were absorbed industry-wide and spawned a vast ecosystem (Next.js, React Native, and more).",
        reasonZh: "它定义了现代前端的范式，你用过的大半互联网产品界面都由它构建。",
        reasonEn: "It defined the modern front-end paradigm; a large share of the web interfaces you've used were built with it.",
      },
      {
        owner: "vercel", name: "next.js", emoji: "▲", display: "Next.js",
        tagZh: "React 全栈框架", tagEn: "React framework",
        introZh: "构建于 React 之上的全栈框架，把服务端渲染（SSR）、静态生成（SSG）、增量再生（ISR）和路由打包成开箱即用的最佳实践，成为构建生产级 React 应用的事实标准。本站前端正是用它搭建。",
        introEn: "A full-stack framework on top of React that bundles server-side rendering (SSR), static generation (SSG), incremental regeneration (ISR), and routing into out-of-the-box best practices — the de facto standard for production React apps. This site's front end is built with it.",
        reasonZh: "它把「如何正确地用 React 做生产应用」标准化了，是当下 Web 工程的主流选择。",
        reasonEn: "It standardized 'how to build production React apps correctly,' and is the mainstream choice in today's web engineering.",
      },
    ],
  },
  {
    keyZh: "AI 浪潮的引擎",
    keyEn: "The Engines of the AI Wave",
    blurbZh: "这一代最重要的技术变革几乎完全建立在开源之上。这五个项目，是从训练到部署、把大模型推向全世界的核心引擎。",
    blurbEn: "The defining technological shift of this generation rests almost entirely on open source. These five projects are the core engines that carried large models — from training to deployment — to the entire world.",
    picks: [
      {
        owner: "pytorch", name: "pytorch", emoji: "🔥", display: "PyTorch",
        tagZh: "深度学习框架", tagEn: "deep learning",
        introZh: "目前 AI 研究领域占绝对主导地位的深度学习框架。动态计算图带来的直观与灵活，让它成为学术界和前沿实验室的首选——当今几乎每一个突破性的大模型，原型都是在 PyTorch 上写出来的。",
        introEn: "The dominant deep-learning framework in AI research today. The intuitiveness and flexibility of its dynamic computation graph made it the default for academia and frontier labs — nearly every breakthrough large model was first prototyped in PyTorch.",
        reasonZh: "它是现代 AI 研究的工作台。这一轮 AI 革命的绝大多数模型，都是在它之上诞生的。",
        reasonEn: "It's the workbench of modern AI research. The vast majority of this AI revolution's models were born on top of it.",
      },
      {
        owner: "huggingface", name: "transformers", emoji: "🤗", display: "Transformers",
        tagZh: "预训练模型库", tagEn: "model library",
        introZh: "Hugging Face 的库，让任何人只需几行代码就能加载、运行和微调成千上万的预训练模型（BERT、GPT、Llama 等）。它连同 Hugging Face Hub，把「使用最先进的 AI 模型」彻底民主化了。",
        introEn: "Hugging Face's library that lets anyone load, run, and fine-tune tens of thousands of pretrained models (BERT, GPT, Llama, and more) in a few lines of code. Together with the Hugging Face Hub, it democratized access to state-of-the-art AI.",
        reasonZh: "它是 AI 模型的「应用商店 + 通用接口」，把前沿研究的门槛降到了人人可及。",
        reasonEn: "It's the app store and universal interface for AI models, dropping the barrier to frontier research to within everyone's reach.",
      },
      {
        owner: "tensorflow", name: "tensorflow", emoji: "📊", display: "TensorFlow",
        tagZh: "机器学习平台", tagEn: "ML platform",
        introZh: "Google 开源的端到端机器学习平台，是把深度学习带向工业级生产部署的先驱。从手机端推理到大规模训练集群，它建立的工程化能力和生态影响了整整一代 ML 系统的设计。",
        introEn: "Google's end-to-end machine-learning platform, a pioneer in taking deep learning to industrial-scale production. From on-device inference to large training clusters, the engineering and ecosystem it established shaped a whole generation of ML system design.",
        reasonZh: "它是把深度学习从论文推向规模化工业应用的开拓者，奠定了 ML 工程化的基础。",
        reasonEn: "It pioneered taking deep learning from papers to industrial scale, laying the foundations of ML engineering.",
      },
      {
        owner: "ggml-org", name: "llama.cpp", emoji: "🦙", display: "llama.cpp",
        tagZh: "本地大模型推理", tagEn: "local LLM inference",
        introZh: "用纯 C/C++ 实现的大模型推理引擎，通过量化技术让 Llama 等模型能在普通笔记本、甚至手机上本地运行，无需昂贵 GPU。它点燃了「本地 / 离线大模型」的整个运动，是 AI 走向边缘与隐私的关键一步。",
        introEn: "An LLM inference engine in pure C/C++ that, via quantization, runs models like Llama locally on ordinary laptops — even phones — without expensive GPUs. It ignited the entire 'local / offline LLM' movement, a key step toward AI at the edge and AI you keep private.",
        reasonZh: "它打破了「跑大模型必须有数据中心」的迷思，把 AI 的算力主权交还给个人。",
        reasonEn: "It shattered the myth that running large models requires a data center, returning AI's compute sovereignty to individuals.",
      },
      {
        owner: "ollama", name: "ollama", emoji: "🦥", display: "Ollama",
        tagZh: "本地大模型运行器", tagEn: "local LLM runner",
        introZh: "把本地运行大模型的体验简化到「一行命令」的工具。它在 llama.cpp 等引擎之上提供了优雅的模型管理与 API 接口，让开发者和爱好者能像用 Docker 一样轻松地拉取、运行各种开源模型。",
        introEn: "A tool that simplifies running local LLMs down to a single command. On top of engines like llama.cpp, it offers elegant model management and an API, letting developers and enthusiasts pull and run open models as easily as using Docker.",
        reasonZh: "它是本地 AI 的「易用层」，正在成为个人与团队私有化部署模型的事实入口。",
        reasonEn: "It's the usability layer for local AI, fast becoming the de facto entry point for private model deployment.",
      },
    ],
  },
  {
    keyZh: "改写规则的异类",
    keyEn: "The Rule-Breaker",
    blurbZh: "有些项目的价值不在于「被多少软件依赖」，而在于它提出了一个全新的命题，改变了人们对某件事可能性的认知。",
    blurbEn: "Some projects matter not for how much software depends on them, but for proposing an entirely new premise — changing what people believe is even possible.",
    picks: [
      {
        owner: "bitcoin", name: "bitcoin", emoji: "₿", display: "Bitcoin Core",
        tagZh: "去中心化货币", tagEn: "decentralized currency",
        introZh: "中本聪 2009 年发布的点对点电子现金系统的参考实现。它首次在没有任何中央机构的前提下解决了「双花问题」，开创了区块链这一全新技术范式，深远地影响了密码学、分布式系统乃至金融与货币的讨论。",
        introEn: "The reference implementation of the peer-to-peer electronic cash system Satoshi Nakamoto released in 2009. It solved the 'double-spending problem' without any central authority for the first time, inaugurating the entirely new paradigm of blockchain and profoundly influencing cryptography, distributed systems, and debates about money itself.",
        reasonZh: "它证明了「无需信任中介的去中心化共识」在现实中可行，开启了一整个新领域。无论你是否认同加密货币，它的技术与思想冲击都已写入历史。",
        reasonEn: "It proved that trustless, decentralized consensus works in the real world, opening an entire new field. Whether or not you embrace cryptocurrency, its technical and conceptual impact is already part of history.",
      },
    ],
  },
];

export default async function PicksPage() {
  const en = (await getLocale()) === "en";

  const c = en
    ? {
        h1: "Editor's Picks · 20 Most Valuable Open-Source Projects",
        intro: "GitHub has hundreds of millions of repositories. This is not a star ranking — it's a hand-curated, opinionated list of the 20 projects I consider the most valuable to the software world as a whole.",
        criteriaH: "How I chose these 20",
        criteriaLead: "I deliberately did not rank by stars. I asked a different question: if this project disappeared tomorrow, how much of the rest of the world would break? Value, to me, is indispensability and depth of dependency. Four lenses guided every pick:",
        criteria: [
          { k: "Foundational", v: "Does the rest of the ecosystem stand on its shoulders? The more things depend on it, the higher it ranks." },
          { k: "Ecosystem scale", v: "How many tools, libraries, companies, and jobs grew out of it? Reach beyond the repo itself." },
          { k: "Paradigm shift", v: "Did it change how people build software — not just give them one more option?" },
          { k: "Durability", v: "Has it withstood the test of time and still leads its domain today?" },
        ],
        balanceH: "On balance & honesty",
        balance: "I balanced the list across domains (infrastructure, cloud, developer tools, AI, and one rule-breaker) so it reflects the breadth of open source rather than one trend. This is an editorial judgment, not an algorithm — reasonable people would swap a few entries, and that's the point of a 'picks' page.",
        tierLabel: "Tier",
        visit: "GitHub",
        detail: "Details on Radar →",
      }
    : {
        h1: "编辑精选 · 20 个最具价值的开源项目",
        intro: "GitHub 上有数亿个仓库。这份名单不是 star 排行——而是我亲自精选、带有明确观点的 20 个项目，是我认为对整个软件世界最具价值的那一批。",
        criteriaH: "我是怎么选出这 20 个的",
        criteriaLead: "我刻意没有按 star 数排序，而是问了一个不同的问题：如果这个项目明天消失，世界上有多少东西会随之崩塌？在我看来，「价值」= 不可替代性 + 被依赖的深度。每一个入选都经过四把尺子的衡量：",
        criteria: [
          { k: "基础设施性", v: "整个生态是否站在它的肩膀上？依赖它的东西越多，排得越靠前。" },
          { k: "生态规模", v: "由它衍生出的工具、库、公司和岗位有多少？影响要超出仓库本身。" },
          { k: "范式影响", v: "它是否改变了人们「构建软件的方式」，而不只是多给了一个选项？" },
          { k: "持久力", v: "它是否经受住了时间检验，至今仍主导着自己的领域？" },
        ],
        balanceH: "关于平衡与坦白",
        balance: "我刻意让名单覆盖多个领域（基础设施、云、开发工具、AI，外加一个异类），让它体现开源的广度，而非追逐单一潮流。这是一份编辑判断，而非算法输出——换掉其中几个也完全合理，而这正是「精选」页存在的意义。",
        tierLabel: "梯队",
        visit: "GitHub",
        detail: "在 Radar 查看详情 →",
      };

  let counter = 0;

  return (
    <article style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 48 }}>
      <h1 className="page-title">{c.h1}</h1>
      <p className="page-sub" style={{ fontSize: 15, lineHeight: 1.85 }}>{c.intro}</p>

      {/* 选择标准 */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "20px 22px",
          marginTop: 18,
        }}
      >
        <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>{c.criteriaH}</h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.8, margin: "0 0 16px" }}>
          {c.criteriaLead}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {c.criteria.map((x, i) => {
            const color = ["var(--accent)", "var(--accent-2)", "var(--green)", "var(--bronze)"][i];
            return (
              <div key={x.k} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span
                  style={{
                    flex: "0 0 auto",
                    minWidth: 96,
                    fontWeight: 750,
                    fontSize: 14.5,
                    color,
                  }}
                >
                  {x.k}
                </span>
                <span style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.7, opacity: 0.92 }}>
                  {x.v}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.75, margin: "16px 0 0", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <b style={{ color: "var(--text)" }}>{c.balanceH}：</b>
          {c.balance}
        </p>
      </section>

      {/* 梯队 + 项目 */}
      {TIERS.map((tier, ti) => (
        <section key={tier.keyEn} style={{ marginTop: 38 }}>
          <h2 style={{ fontSize: 21, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            <span style={{ color: "var(--accent)", marginRight: 8 }}>{c.tierLabel} {ti + 1}</span>
            {en ? tier.keyEn : tier.keyZh}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.75, margin: "0 0 16px" }}>
            {en ? tier.blurbEn : tier.blurbZh}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tier.picks.map((p) => {
              counter += 1;
              return (
                <div
                  key={`${p.owner}/${p.name}`}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "18px 20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 850,
                        color: "var(--muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {String(counter).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 20 }}>{p.emoji}</span>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{p.display}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--accent-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        padding: "2px 10px",
                      }}
                    >
                      {en ? p.tagEn : p.tagZh}
                    </span>
                  </div>

                  <p style={{ margin: "12px 0 0", fontSize: 14.5, lineHeight: 1.8, color: "var(--text)", opacity: 0.95 }}>
                    {en ? p.introEn : p.introZh}
                  </p>

                  <p
                    style={{
                      margin: "12px 0 0",
                      paddingLeft: 12,
                      borderLeft: "3px solid var(--accent)",
                      fontSize: 14,
                      lineHeight: 1.75,
                      color: "var(--text)",
                    }}
                  >
                    <b style={{ color: "var(--accent)" }}>{en ? "Why it's here · " : "入选理由 · "}</b>
                    {en ? p.reasonEn : p.reasonZh}
                  </p>

                  <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 13.5 }}>
                    <a href={`https://github.com/${p.owner}/${p.name}`} target="_blank" rel="noopener noreferrer">
                      {p.owner}/{p.name} · {c.visit}
                    </a>
                    <a href={`/repo/${p.owner}/${p.name}`}>{c.detail}</a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </article>
  );
}
