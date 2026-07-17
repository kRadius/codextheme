import Link from "next/link";
export default function NotFound() { return <main className="not-found"><div><h1>404</h1><p>这个主题页不存在。</p><Link className="primary-link" href="/">返回首页</Link></div></main>; }
