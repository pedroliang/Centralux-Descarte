import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, UploadCloud, FileImage, FileVideo, X, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "../lib/utils"
import { fetchProductDescription } from "../lib/google-sheets"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"]

const formSchema = z.object({
  product_code: z.string().min(1, "Código do produto é obrigatório"),
  condition: z.string().min(1, "Condição é obrigatória"),
  custom_condition: z.string().optional(),
  lot: z.string().optional(),
  brand: z.string().min(1, "Marca é obrigatória"),
  custom_brand: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser pelo menos 1"),
})

export function RegistrationForm({ editId }: { editId?: string }) {
  const navigate = useNavigate()
  const [isFetchingDesc, setIsFetchingDesc] = useState(false)
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
      condition: "",
      brand: "",
    }
  })

  const conditionVal = watch("condition")
  const brandVal = watch("brand")
  const codeVal = watch("product_code")

  useEffect(() => {
    if (editId) {
      const load = async () => {
        const { data } = await supabase.from('descartes').select('*').eq('id', editId).single()
        if (data) {
          setValue("product_code", data.product_code)
          setValue("quantity", data.quantity)
          setValue("date", data.date)
          setValue("lot", data.lot || '')
          
          if (["Amassado", "Queimado", "Faltando peça"].includes(data.condition)) {
            setValue("condition", data.condition)
          } else {
            setValue("condition", "Outros")
            setValue("custom_condition", data.condition)
          }

          if (["Luz Sollar", "Top Light", "Apollo", "Syflar"].includes(data.brand)) {
            setValue("brand", data.brand)
          } else {
            setValue("brand", "Outros")
            setValue("custom_brand", data.brand)
          }

          setDescription(data.product_description)
        }
      }
      load()
    }
  }, [editId, setValue])

  const handleFetchDescription = async () => {
    if (!codeVal) return
    setIsFetchingDesc(true)
    const desc = await fetchProductDescription(codeVal)
    if (desc) {
      setDescription(desc)
      toast.success("Descrição encontrada com sucesso!")
    } else {
      setDescription("Nenhuma descrição encontrada para este código.")
      toast.error("Código não encontrado na planilha de Estoque.")
    }
    setIsFetchingDesc(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      
      const validFiles = newFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Arquivo ${file.name} excede 50MB`)
          return false
        }
        if (![...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].includes(file.type)) {
          toast.error(`Formato inválido para ${file.name}`)
          return false
        }
        return true
      })

      setFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: any) => {
    if (!description || description === "Nenhuma descrição encontrada para este código.") {
      toast.error("Por favor, valide um código de produto que exista na planilha.")
      return
    }

    if (!editId && files.length === 0) {
      toast.error("Por favor, envie pelo menos uma foto ou vídeo evidenciando o problema.")
      return
    }

    setIsSubmitting(true)

    const finalCondition = data.condition === "Outros" ? data.custom_condition || "Não especificado" : data.condition
    const finalBrand = data.brand === "Outros" ? data.custom_brand || "Não especificado" : data.brand

    try {
      // 1. Upload files
      const media_urls: string[] = []
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `discards/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('descartes_media')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('descartes_media')
          .getPublicUrl(filePath)

        media_urls.push(publicUrlData.publicUrl)
      }

      // 2. Insert or Update database
      const payload = {
        product_code: data.product_code,
        product_description: description,
        condition: finalCondition,
        lot: data.lot || null,
        brand: finalBrand,
        quantity: data.quantity,
        date: data.date,
      }

      if (editId) {
        // If files were uploaded, we can optionally append or just leave existing for now. 
        // For simplicity, we only append if there are new media_urls.
        if (media_urls.length > 0) {
          // get existing
          const { data: exist } = await supabase.from('descartes').select('media_urls').eq('id', editId).single()
          const finalMedia = [...(exist?.media_urls || []), ...media_urls]
          await supabase.from('descartes').update({ ...payload, media_urls: finalMedia }).eq('id', editId)
        } else {
          await supabase.from('descartes').update(payload).eq('id', editId)
        }
        toast.success("Descarte atualizado com sucesso!")
      } else {
        const { error: dbError } = await supabase.from('descartes').insert({
          ...payload,
          media_urls
        })
        if (dbError) throw dbError
        toast.success("Descarte registrado com sucesso!")
      }
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)

    } catch (error: any) {
      console.error(error)
      toast.error("Erro ao registrar descarte: " + (error.message || "Tente novamente."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-fade-in relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-2xl shadow-xl border">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Registrando descarte...</p>
          </div>
        </div>
      )}

      {/* Product Code */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Código do Produto <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <input
              {...register("product_code")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ex: PROD-123"
            />
            <button
              type="button"
              onClick={handleFetchDescription}
              disabled={isFetchingDesc || !codeVal}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
            >
              {isFetchingDesc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </button>
          </div>
          {errors.product_code && <p className="text-[0.8rem] font-medium text-destructive">{errors.product_code.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Descrição (Automática)</label>
          <div className={cn(
            "flex min-h-[40px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
            description && description !== "Nenhuma descrição encontrada para este código." && "text-foreground bg-primary/5 border-primary/20",
            description === "Nenhuma descrição encontrada para este código." && "text-destructive bg-destructive/5 border-destructive/20"
          )}>
            {description || "Aguardando busca..."}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Quantity */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Quantidade <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="1"
            {...register("quantity")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.quantity && <p className="text-[0.8rem] font-medium text-destructive">{errors.quantity.message}</p>}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Data do Registro <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            {...register("date")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.date && <p className="text-[0.8rem] font-medium text-destructive">{errors.date.message}</p>}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Condição do Produto <span className="text-destructive">*</span>
          </label>
          <select
            {...register("condition")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Selecione uma condição</option>
            <option value="Amassado">Amassado</option>
            <option value="Queimado">Queimado</option>
            <option value="Faltando peça">Faltando peça</option>
            <option value="Outros">Outros</option>
          </select>
          {errors.condition && <p className="text-[0.8rem] font-medium text-destructive">{errors.condition.message}</p>}
          
          {conditionVal === "Outros" && (
            <input
              {...register("custom_condition")}
              placeholder="Especifique a condição..."
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in"
            />
          )}
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Marca <span className="text-destructive">*</span>
          </label>
          <select
            {...register("brand")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Selecione uma marca</option>
            <option value="Luz Sollar">Luz Sollar</option>
            <option value="Top Light">Top Light</option>
            <option value="Apollo">Apollo</option>
            <option value="Syflar">Syflar</option>
            <option value="Outros">Outros</option>
          </select>
          {errors.brand && <p className="text-[0.8rem] font-medium text-destructive">{errors.brand.message}</p>}
          
          {brandVal === "Outros" && (
            <input
              {...register("custom_brand")}
              placeholder="Digite o nome da marca..."
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in"
            />
          )}
        </div>

        {/* Lot */}
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium leading-none">Lote do Produto</label>
          <input
            {...register("lot")}
            placeholder="Opcional"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Media Upload */}
      <div className="space-y-4 pt-4 border-t">
        <label className="text-base font-semibold">
          Evidências (Fotos ou Vídeos) <span className="text-destructive">*</span>
        </label>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-xl hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
            <UploadCloud className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Clique para enviar</span>
            <span className="text-xs mt-1">Imagens ou Vídeos</span>
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
          </label>

          {files.map((file, idx) => (
            <div key={idx} className="relative flex items-center p-3 h-32 border rounded-xl bg-card border-border overflow-hidden group">
              <div className="flex flex-col items-center justify-center w-full gap-2 relative z-10">
                {file.type.startsWith('video/') ? (
                   <FileVideo className="h-8 w-8 text-primary" />
                ) : (
                   <FileImage className="h-8 w-8 text-primary" />
                )}
                <span className="text-xs font-medium text-center truncate w-full px-2" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white z-20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 shadow-sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {editId ? "Salvar Alterações" : "Registrar Descarte"}
        </button>
      </div>
    </form>
  )
}
