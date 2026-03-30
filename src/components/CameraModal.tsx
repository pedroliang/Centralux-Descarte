import { useEffect, useRef, useState } from "react"
import { Camera, X, RefreshCcw } from "lucide-react"

export function CameraModal({
  isOpen,
  onClose,
  onCapture
}: {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [error, setError] = useState("")

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    if (!isOpen) {
      return
    }

    const startCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
        
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode }
        })
        
        setStream(activeStream)
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream
        }
        setError("")
      } catch (err: any) {
        console.error(err)
        setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.")
      }
    }

    startCamera()
    
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen, facingMode])

  const handleCapture = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" })
          onCapture(file)
          onClose()
        }
      }, "image/jpeg", 0.9)
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      <div className="flex justify-between items-center p-4">
        <button type="button" onClick={toggleCamera} className="p-3 text-white bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-sm transition-colors">
          <RefreshCcw className="h-6 w-6" />
        </button>
        <button type="button" onClick={onClose} className="p-3 text-white bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-sm transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6 bg-red-500/20 rounded-2xl max-w-sm">
            <p>{error}</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-contain"
          />
        )}
      </div>

      <div className="p-8 flex justify-center pb-12">
        <button 
          type="button"
          onClick={handleCapture}
          disabled={!!error}
          className="h-20 w-20 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 ring-4 ring-white/30 ring-offset-4 ring-offset-black"
        >
          <Camera className="h-8 w-8 text-black" />
        </button>
      </div>
    </div>
  )
}
