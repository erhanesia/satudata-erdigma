import { Check, Loader2, Plus, Upload, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  MAX_FILES,
  fileBlocker,
  newFileRow,
  type FileRowState,
} from "@/features/admin/lib/datasetFormState";

import {
  useTopics,
  useUploadDataset,
} from "@/features/dataset/hooks/useDatasets";
import { ApiError } from "@/shared/api/errors";
import { Reveal } from "@/shared/components/motion/Reveal";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useToast } from "@/shared/components/ui/toastStore";
import { formatNumber } from "@/shared/lib/format";
import type { AccessRule, Dataset } from "@/shared/types/api";

import {
  Card,
  CardHeader,
  Chip,
  Field,
  FileRow,
  TextInput,
} from "../components/DatasetFormParts";
import { FormatBadge } from "../components/FormatBadge";
import { AccessRulePicker } from "../components/AccessRulePicker";

/**
 * Terbitkan dataset baru, mengikuti desain "Tambah dataset".
 *
 * **Satu dataset, beberapa berkas.** Tiap berkas diberi nama versi manusia dan
 * jenisnya sendiri. Yang dibaca isinya menjadi tabel hanya CSV pertama; sisanya
 * tersimpan sebagai berkas pendamping yang bisa diunduh — sama seperti XLSX dan
 * PDF pada dataset contoh.
 *
 * **Jenis berkas terbaca sendiri dari ekstensinya dan TIDAK bisa diubah.**
 * Desain menaruh kotak pilih di sini, tapi itu menyerahkan sebuah fakta kepada
 * pendapat: selama bisa dipilih tangan, seseorang bisa menandai berkas .csv
 * sebagai PDF. Server memang menolaknya, tapi penolakan yang baru datang
 * setelah unggahan selesai hanya membuang waktu untuk kesalahan yang
 * seharusnya tidak bisa terjadi. Kotaknya kini bacaan, bukan pilihan.
 *
 * **Topik tidak ada di desain** dan ditambahkan atas permintaan, dengan gaya
 * kartu yang sama.
 *
 * **Disclaimer dan cakupan periode dibuang** dari formulir ini, mengikuti
 * desain. Kolomnya masih ada di database dan di API — dataset lama masih
 * memegang isinya, dan menghapus kolomnya berarti membuang data yang sudah
 * terlanjur ditulis orang. Yang hilang hanya cara mengisinya lewat layar ini.
 */

export default function AdminDatasetNewPage() {
  const { data: user } = useCurrentUser();
  const topics = useTopics();
  const upload = useUploadDataset();
  const toast = useToast();
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileRowState[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [accessRules, setAccessRules] = useState<AccessRule[]>([]);
  // Dataset yang baru terbit, penanda sekaligus isi pop-up berhasil.
  const [published, setPublished] = useState<Dataset | null>(null);

  function change(rowKey: number, ubahan: Partial<FileRowState>) {
    setFiles((previous) =>
      previous.map((b) => (b.rowKey === rowKey ? { ...b, ...ubahan } : b)),
    );
  }

  /**
   * Alasan tombol Unggah belum bisa ditekan, atau null kalau sudah siap.
   *
   * Dikembalikan sebagai kalimat, bukan boolean. Tombol mati tanpa keterangan
   * memaksa orang menebak apa yang kurang — dan pada formulir sepanjang ini,
   * yang kurang biasanya sedang berada di luar layar.
   *
   * Syarat berkasnya dipakai bersama formulir sunting, supaya penolakan yang
   * sama tidak berbunyi berbeda di dua layar yang sengaja dibuat kembar.
   */
  const blocker: string | null =
    fileBlocker(files) ?? (!title.trim() ? "Judul dataset belum diisi" : null);

  function submit() {
    if (blocker) return;

    upload.mutate(
      {
        files: files.map((b) => b.file as File),
        body: {
          title: title.trim(),
          notes: description.trim() || undefined,
          topics: selectedTopics.length ? selectedTopics : undefined,
          accessRules: accessRules.length ? accessRules : undefined,
          // Urutannya sama dengan urutan `files` di atas — back-end
          // memasangkan keduanya menurut urutan itu.
          files: files.map((b) => ({ label: b.label.trim(), format: b.kind })),
        },
      },
      {
        onSuccess: (dataset) => {
          // Sengaja TIDAK langsung berpindah halaman. Menerbitkan dataset itu
          // tindakan yang tidak bisa dibatalkan dan memakan beberapa detik;
          // pindah begitu saja membuat orang bertanya-tanya apakah berkasnya
          // benar-benar masuk — apalagi kalau daftar di halaman tujuan belum
          // sempat menyegarkan diri.
          setPublished(dataset);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError
              ? error.message
              : "Dataset gagal diterbitkan.",
          );
        },
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5 pb-10 sm:pb-16">
      <Reveal>
        <Card>
          <CardHeader
            title="File"
            description="Tambahkan satu atau beberapa file. Tiap file diberi nama sendiri; jenisnya terbaca dari file yang dipilih."
          />

          {files.map((b, i) => (
            <FileRow
              key={b.rowKey}
              rows={b}
              rowNumber={i + 1}
              onChangeRow={(u) => change(b.rowKey, u)}
              onRemove={() =>
                setFiles((previous) =>
                  previous.filter((x) => x.rowKey !== b.rowKey),
                )
              }
            />
          ))}

          {files.length < MAX_FILES ? (
            <button
              type="button"
              onClick={() =>
                setFiles((previous) => [...previous, newFileRow()])
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD2DC] py-4 text-[16px] font-bold text-[#4B5563] transition-colors hover:border-[#4F6BED] hover:bg-[#F7F9FF] hover:text-[#4F6BED]"
            >
              <Plus className="size-[18px]" />
              Tambah file
            </button>
          ) : (
            <p className="mt-4 rounded-lg bg-[#F8FAFC] py-3 text-center text-[13.5px] text-[#9CA3AF]">
              Maksimal {MAX_FILES} berkas dalam satu dataset.
            </p>
          )}
        </Card>
      </Reveal>

      <Reveal delay={70}>
        <Card>
          <Field label="Judul dataset" required>
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Contoh: Rekap Capaian Kinerja Unit"
            />
          </Field>

          <Field label="Deskripsi dataset">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Jelaskan isi dataset ini dan untuk apa dipakai."
              className="w-full resize-y rounded-lg border border-[#E9EBF0] px-3.5 py-3 text-[16px] leading-relaxed text-[#3C4A56] outline-none transition-colors focus:border-[#4F6BED] placeholder:text-[#9CA3AF]"
            />
            {/*
              Penghitungnya dipertahankan meski batasnya dicabut.

              Angka tanpa pembagi tidak lagi terbaca sebagai jatah yang menipis,
              tetapi tetap memberi tahu penulis seberapa panjang tulisannya --
              berguna untuk menakar apakah deskripsinya sudah bertele-tele.

              Batas 500 dicabut karena tidak ada lapisan lain yang memaksanya:
              kolom `dataset.notes` bertipe `text`, dan DTO di back-end tidak
              memasang @Size. Jadi batas itu hanya ada di layar ini, dan
              satu-satunya akibatnya adalah ketikan yang terpotong diam-diam.
            */}
            <div className="mt-1.5 text-[13px] text-[#9CA3AF]">
              {formatNumber(description.length)} karakter
            </div>
          </Field>

          {/* Tidak ada di desain — ditambahkan atas permintaan, gayanya
              mengikuti kartu di sekitarnya. */}
          <Field
            label="Topik"
            hint="Menentukan dataset ini muncul di penyaring topik yang mana. Boleh lebih dari satu."
          >
            <div className="flex flex-wrap gap-2">
              {(topics.data ?? []).map((t) => (
                <Chip
                  key={t.id}
                  active={selectedTopics.includes(t.name ?? "")}
                  onClick={() =>
                    setSelectedTopics((previous) =>
                      previous.includes(t.name ?? "")
                        ? previous.filter((x) => x !== t.name)
                        : [...previous, t.name ?? ""],
                    )
                  }
                >
                  {t.name}
                </Chip>
              ))}
            </div>
          </Field>
        </Card>
      </Reveal>

      {/*
        `minmax(0, 1fr)`, bukan `1fr` — dan `min-w-0` pada tiap itemnya.

        `1fr` sebenarnya berarti `minmax(auto, 1fr)`, dan `auto` itulah yang
        menolak menyusut di bawah lebar min-content isinya. Di dalam kartu ada
        teks ber-`truncate`, yang berarti `white-space: nowrap`, sehingga
        min-content-nya adalah panjang PENUH kalimat itu — sekitar 350px untuk
        "Project Manager Data & IT · DNA · Project Manager".
        Kolomnya lalu melar melewati layar ponsel dan menyeret seluruh kartu
        keluar, sementara `truncate`-nya sendiri tidak pernah sempat bekerja
        karena tidak ada yang memaksanya sempit.
      */}
      <div className="grid gap-3.5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Reveal delay={140} className="h-full min-w-0">
          <Card full>
            <CardHeader
              title="Diunggah oleh"
              description="Terbaca dari akun yang sedang masuk. Tidak bisa diubah."
            />
            <div className="flex items-center gap-3.5 rounded-[10px] border border-[#E9EBF0] px-4 py-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E9EBF0]">
                <User className="size-5 text-[#6B7280]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold text-[#2E3646]">
                  {user?.name ?? "—"}
                </span>
                <span className="block truncate text-[13.5px] text-[#6B7280]">
                  {[user?.position, user?.division?.code, user?.jobLevel]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={190} className="h-full min-w-0">
          <Card full>
            <div className="mb-3.5">
              <h2 className="text-[17px] font-bold text-[#2E3646]">
                Siapa yang boleh melihat
              </h2>
            </div>

            {/*
              Pembungkusnya tidak lagi butuh `relative z-30`. Pemilih lama berupa
              dropdown yang tumbuh melewati batas kartunya, sehingga bilah kaki
              "Unggah" — yang berada setelahnya di DOM — tergambar di atasnya dan
              menutupi pilihan sampai tidak bisa diklik. Pemilih sekarang tumbuh
              di dalam kartunya sendiri, jadi tidak ada yang saling menutup.
            */}
            <AccessRulePicker value={accessRules} onChange={setAccessRules} />
          </Card>
        </Reveal>
      </div>

      <Reveal delay={240}>
        <div className="flex flex-col-reverse gap-3 rounded-lg bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,.06)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => void navigate(paths.adminDatasets)}
            className="rounded-lg py-2 text-[16px] font-bold text-[#4B5563] transition-colors hover:text-[#2E3646] sm:py-0"
          >
            Batal
          </button>

          <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <span
              className={[
                "text-center text-[14px] sm:text-left",
                upload.isPending
                  ? "text-[#4B5563]"
                  : blocker
                    ? "text-[#B45309]"
                    : "text-[#137A46]",
              ].join(" ")}
            >
              {/*
                Saat unggahan berjalan, baris ini berhenti melaporkan kesiapan
                dan mulai melaporkan kemajuan.

                Unggahan besar memakan puluhan detik — satu XLSX berisi 61.876
                baris terukur 64 detik — dan sebagian besar waktu itu dihabiskan
                SETELAH byte terakhir terkirim, saat back-end membaca berkasnya
                lalu memasukkan barisnya. Tanpa kalimat yang berganti di sini,
                yang terlihat penerbit hanya tombol berputar tanpa akhir, dan
                dugaan pertamanya selalu "gagal".
              */}
              {upload.isPending
                ? upload.progress < 100
                  ? `Mengunggah berkas… ${upload.progress}%`
                  : "Berkas terkirim. Sedang membaca isinya, mohon tunggu — jangan tutup halaman ini."
                : (blocker ?? `${files.length} file siap diunggah`)}
            </span>
            <button
              type="button"
              disabled={Boolean(blocker) || upload.isPending}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F2A37] px-7 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[#111A24] disabled:cursor-not-allowed disabled:bg-[#E9EBF0] disabled:text-[#9CA3AF] sm:w-auto"
            >
              {upload.isPending ? (
                <Loader2 className="size-[18px] animate-spin" />
              ) : (
                <Upload className="size-[18px]" />
              )}
              Unggah
            </button>
          </div>
        </div>
      </Reveal>

      <PublishedDialog
        dataset={published}
        onClose={() => {
          setPublished(null);
          void navigate(paths.adminDatasets);
        }}
        onOpenDetail={() => {
          const slug = published?.slug ?? "";
          setPublished(null);
          void navigate(slug ? paths.datasetDetail(slug) : paths.adminDatasets);
        }}
      />
    </div>
  );
}

/**
 * Pop-up setelah dataset terbit.
 *
 * Menutupnya membawa ke daftar dataset — jadi tidak ada jalan buntu: apa pun
 * yang ditekan, orangnya berpindah ke tempat yang masuk akal.
 *
 * Angkanya diambil dari respons unggah, bukan dari isian formulir. Jumlah baris
 * dan kolom baru diketahui setelah berkasnya dibaca server, dan menampilkan
 * apa yang benar-benar tersimpan adalah satu-satunya cara pop-up ini menjadi
 * konfirmasi, bukan sekadar ucapan selamat.
 */
function PublishedDialog({
  dataset,
  onClose,
  onOpenDetail,
}: {
  dataset: Dataset | null;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  const files = dataset?.resources ?? [];

  return (
    <Dialog
      open={dataset !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Dataset berhasil diterbitkan"
      description={dataset?.title ?? ""}
    >
      <div className="flex items-center gap-3.5 rounded-[10px] border border-[#CDE9D8] bg-[#F2FBF6] px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCF3E6]">
          <Check className="size-5 text-[#137A46]" strokeWidth={3} />
        </span>
        <div className="min-w-0 text-[13.5px] leading-relaxed text-[#137A46]">
          Dataset sudah masuk katalog dan bisa dibuka karyawan yang berhak.
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="Berkas" value={`${files.length}`} />
        <Stat label="Baris" value={formatNumber(dataset?.rowCount ?? 0)} />
        <Stat label="Kolom" value={formatNumber(dataset?.colCount ?? 0)} />
      </dl>

      <div className="mt-3 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
        <div className="font-mono text-[12.5px] text-[#6B7280]">
          {dataset?.slug}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {files.map((r) => (
            <FormatBadge key={r.id} ext={(r.formatName ?? "").toUpperCase()} />
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#E9EBF0] px-4 py-2.5 text-[14px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC]"
        >
          Ke daftar dataset
        </button>
        <button
          type="button"
          onClick={onOpenDetail}
          className="rounded-lg bg-[#1F2A37] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#111A24]"
        >
          Lihat dataset
        </button>
      </div>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
      <dt className="text-[12.5px] text-[#9CA3AF]">{label}</dt>
      <dd className="mt-0.5 text-[19px] leading-none font-bold text-[#2E3646]">
        {value}
      </dd>
    </div>
  );
}
