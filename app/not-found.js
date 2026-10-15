import Link from 'next/link';

export const metadata = { title: 'Page nahi mila' };

export default function NotFound() {
  return (
    <div className="view">
      <div className="nf">
        <div className="nf-code">404</div>
        <h1 className="page-h1">Ye page nahi mila</h1>
        <p className="page-sub">Link purana ho sakta hai ya address me typo hai. Home se roadmap dekhiye, ya upar search box me topic dhoondhiye.</p>
        <Link className="btn" href="/">Home par jaayein</Link>
      </div>
    </div>
  );
}
