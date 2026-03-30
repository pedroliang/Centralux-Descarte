import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Loader2, Search, X } from "lucide-react"
import { format } from "date-fns"

type Discard = {
  id: string
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
}

export function PublicViewPage() {
  const [discards, setDiscards] = useState<Discard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCode, setSearchCode] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedMediaSrc, setSelectedMediaSrc] = useState<string | null>(null)

  useEffect(() => {
    const fetchDiscards = async () => {
      setLoading(true)
      let query = supabase.from('descartes').select('*').order('created_at', { ascending: false })
      
      if (searchCode) {
        query = query.ilike('product_code', `%${searchCode}%`)
      }
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data } = await query
      setDiscards(data || [])
      setLoading(false)
    }
    fetchDiscards()
  }, [searchCode, startDate, endDate])

  const isVideo = (url: string) => /\.(mp4|webm)$/i.test(url.split('?')[0])

  return (
    <div className="space-y-6">
      <div className="text-center pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatório de Descartes</h1>
        <p className="text-muted-foreground mt-2">
          Visualização pública dos produtos descartados na CentraLux.
        </p>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Pesquisar por Código..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="flex h-10 w-full rounded-full border border-input bg-background/50 backdrop-blur pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="relative flex-1 flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex h-10 w-full rounded-full border border-input bg-background/50 backdrop-blur px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Inicial"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex h-10 w-full rounded-full border border-input bg-background/50 backdrop-blur px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Final"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : discards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {discards.map(discard => (
            <div key={discard.id} className="bg-card text-card-foreground rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg text-primary">{discard.product_code}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {format(new Date(discard.date), 'dd/MM/yyyy')}
                  </span>
                </div>
                <p className="text-sm font-medium mb-4">{discard.product_description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div><span className="font-medium text-foreground">Marca:</span> {discard.brand}</div>
                  <div><span className="font-medium text-foreground">Cliente:</span> {discard.customer_name || '-'}</div>
                  <div><span className="font-medium text-foreground">Lote:</span> {discard.lot || '-'}</div>
                  <div><span className="font-medium text-foreground">Qtd:</span> {discard.quantity}</div>
                  <div className="col-span-2"><span className="font-medium text-foreground">Condição:</span> {discard.condition}</div>
                </div>
              </div>
              
              {discard.media_urls && discard.media_urls.length > 0 && (
                <div className="bg-muted/30 p-3 border-t">
                  <p className="text-xs font-semibold mb-2 px-2 text-foreground/80">Evidências ({discard.media_urls.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 px-2 snap-x">
                    {discard.media_urls.map((url, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedMediaSrc(url)}
                        className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border/50 hover:opacity-80 transition-opacity snap-center"
                      >
                        {isVideo(url) ? (
                          <video src={url} className="h-full w-full object-cover" />
                        ) : (
                          <img src={url} alt={`Evidência ${idx+1}`} className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Modal for Media */}
      {selectedMediaSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <button 
            onClick={() => setSelectedMediaSrc(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-4xl max-h-[90vh] w-full flex justify-center items-center">
             {isVideo(selectedMediaSrc) ? (
               <video src={selectedMediaSrc} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
             ) : (
               <img src={selectedMediaSrc} alt="Evidência ampliada" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
             )}
          </div>
        </div>
      )}
    </div>
  )
}
