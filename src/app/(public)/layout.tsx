import Image from "next/image";
import Link from "next/link";
import { CustomButton } from "@/src/components/custom-button";
import { getWhatsappDisplayPhone } from "@/src/lib/whatsapp";
import eliteLogo from "@/public/brands/elite-da-raca-logo.svg";

const navigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/#catalogo", label: "Catalogo" },
];

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-[#0d0c0b] text-[#ece6dd] min-h-dvh flex flex-col">
      <header className="relative h-20">
        <div className="fixed inset-x-0 top-0 z-20 border-b border-white/8 bg-[#0f0e0d]/92 backdrop-blur-xl">
          <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-8">
            <Link href="/" className="justify-self-start" aria-label="Elite da Raca">
              <Image src={eliteLogo} alt="Elite da Raca" className="h-11 w-auto" priority />
            </Link>

            <nav className="justify-self-center overflow-x-auto">
              <ul className="flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/4 p-1 shadow-[0_14px_34px_-24px_rgba(0,0,0,0.8)]">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-[#d6cdc1] transition hover:bg-[#b8aea4] hover:text-[#11100f]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div aria-hidden className="h-10 justify-self-end" />
          </div>
        </div>
      </header>

      <main className="flex flex-1">{children}</main>

      <footer id="contato" className="flex flex-col items-center gap-2 border-t border-white/8 bg-[#131110] px-6 py-10 text-center text-[#b9afa2]">
        <p className="text-sm font-medium text-[#f3ede5]">Haras Ltda. - CNPJ: 12.345.678/0000-01 - Rua teste, 132 - Ubaporanga, MG 12345-678</p>
        <p className="text-sm">info@meusite.com - Tel: {getWhatsappDisplayPhone()}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-[#81786d]">© 2026 Elite da Raca</p>
      </footer>

      <CustomButton floating />
    </div>
  );
}
