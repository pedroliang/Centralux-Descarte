import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Link } from "react-router-dom"
import { Loader2, Search, Trash2, Printer, ExternalLink, Edit, X, ImageIcon, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import ExcelJS from "exceljs"

type Discard = {
  id: string
  seq_id: number
  created_at: string
  date: string
  product_code: string
  product_description: string
  condition: string
  lot: string | null
  brand: string
  customer_name: string | null
  quantity: number
  media_urls: string[] | null
  observacao: string | null
}

export function DashboardPage() {
  const [discards, setDiscards] = useState<Discard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedMedia, setSelectedMedia] = useState<{ urls: string[]; index: number } | null>(null)
  const [selectedObservacao, setSelectedObservacao] = useState<string | null>(null)

  const fetchDiscards = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('descartes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      toast.error("Erro ao carregar os dados")
    } else {
      // Atribui IDs sequenciais baseados na ordem de criação (mais antigo = #1)
      const withSeqIds = (data || []).map((item, index) => ({
        ...item,
        seq_id: index + 1,
      }))
      // Inverte para exibir do mais recente ao mais antigo
      setDiscards([...withSeqIds].reverse())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDiscards()
  }, [])

  const handleDelete = async (id: string, mediaUrls: string[] | null) => {
    if (!confirm("Tem certeza que deseja apagar este registro?")) return

    try {
      if (mediaUrls && mediaUrls.length > 0) {
        const filePaths = mediaUrls.map(url => {
          const parts = url.split('/')
          return `discards/${parts[parts.length - 1]}`
        })
        await supabase.storage.from('descartes_media').remove(filePaths)
      }

      const { error } = await supabase.from('descartes').delete().eq('id', id)
      if (error) throw error

      toast.success("Registro apagado com sucesso")
      setDiscards(prev => prev.filter(d => d.id !== id))
    } catch (error) {
      console.error(error)
      toast.error("Erro ao apagar registro")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    const toastId = toast.loading("Gerando arquivo Excel...");
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Descartes");

      worksheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Código", key: "codigo", width: 12 },
        { header: "Descrição", key: "descricao", width: 40 },
        { header: "Lote", key: "lote", width: 15 },
        { header: "Marca", key: "marca", width: 15 },
        { header: "Condição", key: "condicao", width: 15 },
        { header: "Cliente", key: "cliente", width: 25 },
        { header: "Obs", key: "obs", width: 30 },
        { header: "Data", key: "data", width: 15 },
        { header: "Qtd", key: "quantidade", width: 8 },
        { header: "Imagem", key: "imagem", width: 12 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      for (let i = 0; i < filteredDiscards.length; i++) {
        const discard = filteredDiscards[i];
        
        let dateStr = "";
        try {
          if (discard.date) {
            dateStr = format(new Date(discard.date + 'T00:00:00'), 'dd/MM/yyyy');
          }
        } catch(e) {}

        const row = worksheet.addRow({
          id: `#${discard.seq_id}`,
          codigo: discard.product_code || '-',
          descricao: discard.product_description || '-',
          lote: discard.lot || '-',
          marca: discard.brand || '-',
          condicao: discard.condition || '-',
          cliente: discard.customer_name || '-',
          obs: discard.observacao || '-',
          data: dateStr,
          quantidade: discard.quantity || 1,
          imagem: ''
        });

        row.alignment = { vertical: 'middle' };

        if (discard.media_urls && discard.media_urls.length > 0) {
          row.height = 50; 
          const imgUrl = discard.media_urls[0];
          
          if (!isVideo(imgUrl)) {
            try {
              const response = await fetch(imgUrl);
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              
              let extension = 'jpeg';
              if (blob.type === 'image/png' || imgUrl.toLowerCase().endsWith('.png')) extension = 'png';
              
              const imageId = workbook.addImage({
                buffer: arrayBuffer,
                extension: extension as 'jpeg' | 'png' | 'gif',
              });
              
              worksheet.addImage(imageId, {
                tl: { col: 10, row: row.number - 1 + 0.1 }, 
                ext: { width: 56, height: 56 },
                editAs: 'oneCell',
              });
            } catch (e) {
              console.warn("Could not load image for Excel:", imgUrl);
            }
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Descartes_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel gerado com sucesso!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar Excel.", { id: toastId });
    }
  }

  const isVideo = (url: string) => /\.(mp4|webm)$/i.test(url.split('?')[0])

  const normalizeText = (text: any) => {
    if (text === null || text === undefined) return ""
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  const filteredDiscards = discards.filter(discard => {
    // Filtro de data (client-side para preservar os IDs sequenciais)
    if (startDate && discard.date < startDate) return false
    if (endDate && discard.date > endDate) return false

    if (!searchTerm) return true

    let dateStr = ""
    try {
      if (discard.date) {
        const d = new Date(discard.date + 'T00:00:00')
        if (!isNaN(d.getTime())) {
          dateStr = format(d, 'dd/MM/yyyy')
        }
      }
    } catch (e) {
      console.warn("Invalid date during search:", discard.date)
    }

    const searchFields = [
      String(discard.seq_id),      // Pesquisa por ID (#1, #2 ...)
      discard.product_code,
      discard.brand,
      discard.lot,
      discard.condition,
      discard.product_description,
      discard.customer_name,
      discard.observacao,
      discard.quantity,
      dateStr,
    ]

    const searchString = normalizeText(searchFields.map(f => f ?? "").join(' '))
    const searchWords = normalizeText(searchTerm).split(' ').filter(w => w.trim().length > 0)

    return searchWords.every(word => searchString.includes(word))
  })

  const navigateMedia = (direction: 1 | -1) => {
    setSelectedMedia(prev => {
      if (!prev) return null
      const next = (prev.index + direction + prev.urls.length) % prev.urls.length
      return { ...prev, index: next }
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel de Descartes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e visualize todos os registros efetuados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden justify-end">
          <button
            onClick={() => window.open('/public', '_blank')}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Relatório
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 h-10 px-4 py-2 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Gerar Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Lista
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Pesquisar por ID, código, descrição, marca, lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="relative flex-[1.5] flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Inicial"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Final"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card text-card-foreground rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-4 font-medium w-12">#</th>
                <th className="px-4 py-4 font-medium">Código</th>
                <th className="px-4 py-4 font-medium">Descrição</th>
                <th className="px-4 py-4 font-medium">Marca</th>
                <th className="px-4 py-4 font-medium">Obs</th>
                <th className="px-4 py-4 font-medium">Data</th>
                <th className="px-4 py-4 font-medium text-center print:hidden">Imagem</th>
                <th className="px-4 py-4 font-medium text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredDiscards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredDiscards.map((discard) => (
                  <tr key={discard.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    {/* ID Sequencial */}
                    <td className="px-4 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      #{discard.seq_id}
                    </td>

                    {/* Código */}
                    <td className="px-4 py-4 font-medium whitespace-nowrap">
                      {discard.product_code}
                    </td>

                    {/* Descrição */}
                    <td className="px-4 py-4 min-w-[200px]">
                      {discard.product_description}
                      {discard.lot && (
                        <p className="text-xs text-muted-foreground mt-1">Lote: {discard.lot}</p>
                      )}
                    </td>

                    {/* Marca */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary text-xs">
                        {discard.brand}
                      </span>
                    </td>

                    {/* Obs */}
                    <td className="px-4 py-4 max-w-[200px]">
                      {discard.observacao ? (
                        <button
                          onClick={() => setSelectedObservacao(discard.observacao)}
                          className="text-left text-xs text-foreground hover:text-primary transition-colors line-clamp-2 leading-relaxed"
                          title="Ver observação completa"
                        >
                          {discard.observacao}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Data */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {format(new Date(discard.date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </td>

                    {/* Imagem */}
                    <td className="px-4 py-4 text-center print:hidden">
                      {discard.media_urls?.length ? (
                        <button
                          onClick={() => setSelectedMedia({ urls: discard.media_urls!, index: 0 })}
                          className="inline-flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 h-7 px-2.5 rounded-md text-xs font-medium border border-primary/20 transition-colors"
                          title="Ver imagens"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          {discard.media_urls.length}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-4 text-right print:hidden space-x-1">
                      <Link
                        to={`/edit/${discard.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
                        title="Editar Registro"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(discard.id, discard.media_urls)}
                        className="inline-flex items-center justify-center p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                        title="Apagar Registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estilos de Impressão */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: auto;
          }
          :root {
            --background: 0 0% 100% !important;
            --foreground: 0 0% 0% !important;
            --card: 0 0% 100% !important;
            --muted: 0 0% 100% !important;
          }
          html, body {
            background-color: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          main, main * { visibility: visible; }
          main {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #fff !important;
          }
          h1, p, th, td, span, div, strong, b {
            color: #000 !important;
            background-color: transparent !important;
          }
          .bg-card {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .text-muted-foreground { color: #000 !important; }
          .bg-muted\\/50 {
            background-color: transparent !important;
            border-bottom: 2px solid #000 !important;
          }
          .border-b { border-bottom: 1px solid #777 !important; }
          .bg-primary\\/10 {
            background-color: transparent !important;
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .font-medium, .font-bold { font-weight: 700 !important; }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            background-color: #fff !important;
          }
          th {
            text-transform: uppercase !important;
            font-weight: 800 !important;
            padding: 12px 6px !important;
            color: #000 !important;
            border-bottom: 2px solid #000 !important;
          }
          td {
            padding: 10px 6px !important;
            color: #000 !important;
            border-bottom: 1px solid #eee !important;
          }
        }
      `}</style>

      {/* Modal de Galeria de Imagens */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          {/* Fechar */}
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-[110]"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navegação (apenas se houver mais de 1 imagem) */}
          {selectedMedia.urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateMedia(-1) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-[110]"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateMedia(1) }}
                className="absolute right-16 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-[110]"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-1.5 rounded-full z-[110]">
                {selectedMedia.index + 1} / {selectedMedia.urls.length}
              </div>
            </>
          )}

          {/* Mídia */}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo(selectedMedia.urls[selectedMedia.index]) ? (
              <video
                key={selectedMedia.urls[selectedMedia.index]}
                src={selectedMedia.urls[selectedMedia.index]}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img
                key={selectedMedia.urls[selectedMedia.index]}
                src={selectedMedia.urls[selectedMedia.index]}
                alt={`Imagem ${selectedMedia.index + 1} de ${selectedMedia.urls.length}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Modal de Observação */}
      {selectedObservacao && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedObservacao(null)}
        >
          <div
            className="relative bg-card border rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold text-lg">Observação</h3>
              <button
                onClick={() => setSelectedObservacao(null)}
                className="ml-auto p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg px-4 py-3 border">
              {selectedObservacao}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
