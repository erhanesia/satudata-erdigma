import { Search, X } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import {
  useAccessRuleNames,
  useEmployees,
  useJobLevels,
  usePositions,
  type HrisRef,
} from "../hooks/useAccessOptions";

import { Skeleton } from "@/shared/components/ui/Skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/Tabs";
import { cn } from "@/shared/lib/cn";
import type { AccessRule } from "@/shared/types/api";

/**
 * Pemilih "Siapa yang boleh melihat", dengan tiga sumbu.
 *
 * Ketiganya berdiri SEJAJAR, bukan bertingkat: dataset terlihat bila salah satu
 * aturan cocok. Memilih jenjang "Manager" lalu menunjuk seorang Magang berarti
 * seluruh Manager DAN Magang itu bisa melihat — bukan irisan keduanya. Kalimat
 * pembuka menyatakan itu, karena "atau" versus "dan" adalah tempat orang paling
 * sering salah menduga, dan salah duga di sini berujung data terbuka untuk orang
 * yang tidak dimaksud.
 *
 * <h2>Kenapa tab, bukan tiga bagian bertumpuk</h2>
 *
 * Versi pertama menaruh ketiganya berjajar ke bawah. HRIS punya enam puluhan
 * posisi, jadi kartunya memanjang beberapa layar dan menenggelamkan kolom
 * sebelahnya — dan bagian karyawan, yang paling jarang dipakai, terdorong ke
 * tempat yang tidak pernah terlihat tanpa menggulung jauh.
 *
 * Tab membuat tinggi kartunya tetap berapa pun isinya. Yang biasanya hilang dari
 * tab adalah "apa yang sudah saya pilih di tab lain" — itu dijawab dua kali:
 * angka kecil di judul tiap tab, dan ringkasan di bawah yang menampilkan pilihan
 * dari ketiga sumbu sekaligus.
 */
export function AccessRulePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: AccessRule[];
  onChange: (rules: AccessRule[]) => void;
  disabled?: boolean;
}) {
  const selected = useMemo(
    () => new Set(value.map((rule) => keyOf(rule))),
    [value],
  );

  /*
    Nama yang sudah terbaca di layar, diingat memakai id-nya.

    Saat admin menekan lencana "Budi Santoso", namanya ADA di tangan kita persis
    pada saat itu. Menyimpannya di sini berarti ringkasan di bawah bisa langsung
    menulis "Budi Santoso" tanpa menanyakan balik ke HRIS id yang barusan kita
    kirim sendiri.

    useRef, bukan useState: isinya tidak pernah menentukan tampilan sendirian.
    Setiap kali peta ini bertambah, `value` juga berubah, dan itu yang memicu
    render ulang. useState hanya menambah satu render tanpa hasil berbeda.

    Yang tidak tertutup peta ini adalah aturan yang datang dari server saat
    dataset lama dibuka — dan itulah yang dicarikan `useAccessRuleNames`.
  */
  const nameMemory = useRef(new Map<string, string>());

  function toggle(rule: AccessRule, name?: string) {
    if (name) nameMemory.current.set(rule.ruleValue, name);
    const key = keyOf(rule);
    onChange(
      selected.has(key)
        ? value.filter((r) => keyOf(r) !== key)
        : [...value, rule],
    );
  }

  function countOf(type: AccessRule["ruleType"]) {
    return value.filter((rule) => rule.ruleType === type).length;
  }

  return (
    <div>
      <p className="text-[13.5px] leading-relaxed text-[#4B5563]">
        Dikosongkan berarti terbuka untuk seluruh karyawan. Kalau diisi, dataset
        terlihat oleh siapa pun yang cocok dengan <b>salah satu</b> pilihan.
        ketiganya berdiri sejajar, bukan saling mempersempit.
      </p>

      <Tabs defaultValue="JOB_LEVEL" className="mt-4">
        <TabsList>
          <TabsTrigger value="JOB_LEVEL">
            Job Level <TabCount total={countOf("JOB_LEVEL")} />
          </TabsTrigger>
          <TabsTrigger value="POSITION">
            Posisi <TabCount total={countOf("POSITION")} />
          </TabsTrigger>
          <TabsTrigger value="EMPLOYEE">
            Karyawan <TabCount total={countOf("EMPLOYEE")} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="JOB_LEVEL">
          <JobLevelPanel
            selected={selected}
            onToggle={toggle}
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="POSITION">
          <SearchablePanel
            kind="POSITION"
            hint="Peran fungsional dari HRIS, misalnya Data Manager atau Social Media Specialist."
            placeholder="Cari posisi…"
            selected={selected}
            onToggle={toggle}
            disabled={disabled}
          />
        </TabsContent>

        <TabsContent value="EMPLOYEE">
          <SearchablePanel
            kind="EMPLOYEE"
            hint="Menunjuk orang secara langsung, tanpa memedulikan jabatannya."
            placeholder="Ketik minimal 2 huruf nama karyawan…"
            selected={selected}
            onToggle={toggle}
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>

      <SelectedSummary
        value={value}
        known={nameMemory.current}
        onRemove={toggle}
        disabled={disabled}
      />
    </div>
  );
}

/** Kunci pembanding: jenis dan nilai harus cocok berpasangan, bukan salah satunya. */
function keyOf(rule: AccessRule): string {
  return `${rule.ruleType}:${rule.ruleValue}`;
}

/** Angka kecil di judul tab, supaya pilihan di tab yang tertutup tidak tak terlihat. */
function TabCount({ total }: { total: number }) {
  if (total === 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-[#EEF1FE] px-1.5 py-0.5 text-[11.5px] font-bold text-[#3B51C4]">
      {total}
    </span>
  );
}

/** Dua belas jenjang, ditampilkan seluruhnya karena daftarnya memang pendek. */
function JobLevelPanel({
  selected,
  onToggle,
  disabled,
}: {
  selected: Set<string>;
  onToggle: (rule: AccessRule, name?: string) => void;
  disabled: boolean;
}) {
  const query = useJobLevels();

  return (
    <>
      <ChipArea>
        {query.isPending
          ? Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))
          : (query.data ?? []).map((level) => (
              <Chip
                key={level}
                active={selected.has(`JOB_LEVEL:${level}`)}
                disabled={disabled}
                onClick={() =>
                  onToggle({ ruleType: "JOB_LEVEL", ruleValue: level })
                }
              >
                {level}
              </Chip>
            ))}
      </ChipArea>
    </>
  );
}

/**
 * Panel berpencarian, dipakai posisi maupun karyawan.
 *
 * Keduanya berperilaku sama: ketik, lalu pilih dari hasilnya. Bedanya ambang
 * kata kunci, dan itu ditentukan hook masing-masing — `useEmployees` tidak
 * menembak sebelum dua huruf karena back-end menolaknya, sedangkan posisi boleh
 * ditelusuri tanpa mengetik apa-apa.
 */
function SearchablePanel({
  kind,
  hint,
  placeholder,
  selected,
  onToggle,
  disabled,
}: {
  kind: "POSITION" | "EMPLOYEE";
  hint: string;
  placeholder: string;
  selected: Set<string>;
  onToggle: (rule: AccessRule, name?: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");

  // Kedua hook selalu dipanggil — aturan hook melarang pemanggilan bersyarat.
  // Yang tidak dipakai diberi kata kunci kosong sehingga tidak menembak.
  const positionQuery = usePositions(kind === "POSITION" ? search : "");
  const employeeQuery = useEmployees(kind === "EMPLOYEE" ? search : "");

  const query = kind === "POSITION" ? positionQuery : employeeQuery;
  const items: HrisRef[] = query.data ?? [];

  return (
    <>
      <PanelHint>{hint}</PanelHint>

      <div className="relative mt-2.5">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9CA3AF]"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-[10px] border border-[#E9EBF0] bg-white py-2.5 pr-3 pl-9 text-[14px] outline-none focus:border-[#4F6BED] disabled:bg-[#F8FAFC]"
        />
      </div>

      <ChipArea>
        {query.isFetching ? (
          <Note>Memuat…</Note>
        ) : query.isError ? (
          <Note tone="error">Daftar dari HRIS sedang tidak bisa diambil.</Note>
        ) : kind === "EMPLOYEE" && search.trim().length < 2 ? (
          <Note>Ketik minimal 2 huruf untuk mencari.</Note>
        ) : items.length === 0 ? (
          <Note>Tidak ada yang cocok.</Note>
        ) : (
          items.map((item) => (
            <Chip
              key={item.id}
              active={selected.has(`${kind}:${item.id}`)}
              disabled={disabled}
              onClick={() =>
                onToggle({ ruleType: kind, ruleValue: item.id }, item.name)
              }
            >
              {item.name}
            </Chip>
          ))
        )}
      </ChipArea>
    </>
  );
}

/**
 * Wadah lencana bertinggi tetap.
 *
 * Tingginya dikunci, bukan dibiarkan mengikuti isi: daftar posisi HRIS ada enam
 * puluhan, dan tanpa kunci ini kartunya memanjang beberapa layar begitu tab
 * Posisi dibuka — persis masalah yang membuat tab ini ada. Digulung ke dalam,
 * jadi halaman di sekelilingnya tidak ikut bergeser saat kata kuncinya diganti.
 */
function ChipArea({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex max-h-[184px] flex-wrap content-start gap-2 overflow-y-auto pr-1">
      {children}
    </div>
  );
}

/**
 * Daftar yang sudah dipilih, dikumpulkan di satu tempat.
 *
 * Ini yang membayar ongkos tab: pilihan di tab yang sedang tertutup tetap
 * terlihat, dan pilihan di panel berpencarian tidak menghilang begitu kata
 * kuncinya diganti. Tanpa ini penerbit kehilangan jejak apa saja yang sudah ia
 * pilih, tepat saat ia paling perlu tahu.
 *
 * Yang ditampilkan NAMA, bukan UUID yang tersimpan. Deretan
 * `454909f7-0720-4547-88fb-…` tidak bisa dinilai benar-salah oleh siapa pun, dan
 * admin yang membuka kembali sebuah dataset tidak akan ingat itu id milik siapa.
 * Untuk yang baru saja dipilih namanya diambil dari `known` tanpa permintaan
 * apa pun; sisanya dicarikan {@link useAccessRuleNames}.
 *
 * UUID tetap ditampilkan apa adanya kalau namanya benar-benar tidak ketemu —
 * karyawan yang sudah dihapus, misalnya. Jelek, tetapi lebih jujur daripada
 * menghilangkan barisnya: aturannya nyata dan tetap berlaku.
 */
function SelectedSummary({
  value,
  known,
  onRemove,
  disabled,
}: {
  value: AccessRule[];
  known: Map<string, string>;
  onRemove: (rule: AccessRule) => void;
  disabled: boolean;
}) {
  const nameOf = useAccessRuleNames(value, known);

  if (value.length === 0) {
    return (
      <div className="mt-4 rounded-[10px] border border-dashed border-[#E9EBF0] px-4 py-3 text-[13.5px] text-[#6B7280]">
        Belum ada pembatasan. Dataset ini akan terbuka untuk seluruh karyawan.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[10px] border border-[#E9EBF0] bg-[#F8FAFC] px-4 py-3">
      <div className="mb-2 text-[13px] font-bold text-[#2E3646]">
        {value.length} pembatasan dipilih
      </div>
      <div className="flex max-h-[132px] flex-wrap content-start gap-2 overflow-y-auto pr-1">
        {value.map((rule) => (
          <span
            key={keyOf(rule)}
            className="inline-flex h-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#3C4A56] shadow-[0_1px_2px_rgba(16,24,40,.06)]"
          >
            <span className="text-[11px] font-bold text-[#9CA3AF]">
              {typeLabel(rule.ruleType)}
            </span>
            {nameOf(rule)}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(rule)}
              aria-label={`Hapus pembatasan ${nameOf(rule)}`}
              className="text-[#9CA3AF] transition-colors hover:text-[#B4231B]"
            >
              <X className="size-3.5" strokeWidth={2.6} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function typeLabel(type: AccessRule["ruleType"]): string {
  return type === "JOB_LEVEL"
    ? "Job Level"
    : type === "POSITION"
      ? "Posisi"
      : "Karyawan";
}

function PanelHint({ children }: { children: ReactNode }) {
  return <div className="text-[13px] text-[#6B7280]">{children}</div>;
}

function Note({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <span
      className={cn(
        "text-[13px]",
        tone === "error" ? "text-[#B4231B]" : "text-[#9CA3AF]",
      )}
    >
      {children}
    </span>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-fit rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-colors disabled:opacity-50",
        active
          ? "border-[#4F6BED] bg-[#EEF1FE] text-[#3B51C4]"
          : "border-[#E9EBF0] bg-white text-[#4B5563] hover:bg-[#F8FAFC]",
      )}
    >
      {children}
    </button>
  );
}
