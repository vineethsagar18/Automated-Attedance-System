'use client'

import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScan: (studentId: string) => void
}

export function QRScanner({ onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastScanRef = useRef<string>('')
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  async function startScanner() {
    setLoading(true)
    setError(null)
    
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Wait for video to load before starting scan
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Error playing video:', err)
            setError('Failed to play video stream')
          })
          setIsActive(true)
          setLoading(false)
          startQRScanning()
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      setLoading(false)
      let message = '❌ Failed to access camera.'
      
      if (error?.name === 'NotAllowedError') {
        message = '❌ Camera permission denied. Allow camera in browser settings.'
      } else if (error?.name === 'NotFoundError') {
        message = '❌ No camera found on this device.'
      } else if (error?.name === 'NotReadableError') {
        message = '❌ Camera is already in use by another app.'
      }
      
      setError(message)
    }
  }

  function startQRScanning() {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    scanIntervalRef.current = setInterval(() => {
      if (!isActive || video.readyState !== video.HAVE_ENOUGH_DATA) return

      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Try to decode QR code with original image
        let code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        })

        // If not found, try with contrast enhancement
        if (!code) {
          const data = imageData.data
          
          // Calculate brightness average
          let totalBrightness = 0
          for (let i = 0; i < data.length; i += 4) {
            totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          }
          const avgBrightness = totalBrightness / (data.length / 4)
          
          // Apply contrast enhancement
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i]
            let g = data[i + 1]
            let b = data[i + 2]
            
            // Convert to grayscale
            const gray = r * 0.299 + g * 0.587 + b * 0.114
            
            // Enhance contrast around the average
            const contrast = (gray - avgBrightness) * 1.5 + avgBrightness
            const enhanced = Math.min(255, Math.max(0, contrast))
            
            data[i] = enhanced
            data[i + 1] = enhanced
            data[i + 2] = enhanced
          }
          
          code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          })
        }

        if (code) {
          const decodedText = code.data
          
          // Prevent duplicate scans within 2 seconds
          if (decodedText === lastScanRef.current) return
          lastScanRef.current = decodedText
          setTimeout(() => { lastScanRef.current = '' }, 2000)

          console.log('✅ QR Detected:', decodedText)

          try {
            const payload = JSON.parse(decodedText)
            if (payload.studentId) {
              console.log('✅ Valid student QR:', payload)
              onScan(payload.studentId)
            }
          } catch (err) {
            console.log('ℹ️ QR content (not student QR):', decodedText)
          }
        }
      } catch (err) {
        console.debug('Scan error:', err)
      }
    }, 100)
  }

  function stopScanner() {
    try {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    } catch (err) {
      console.error('Error stopping scanner:', err)
    }
    setIsActive(false)
    setError(null)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="space-y-4 w-full">
      {error && (
        <div className="w-full bg-secondary/15 border border-secondary/30 rounded-lg p-3 text-sm text-foreground">
          {error}
        </div>
      )}

      {!isActive ? (
        <button
          id="start-scanner-btn"
          onClick={startScanner}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? '⏳ Requesting camera...' : '📷 Start QR Scanner'}
        </button>
      ) : (
        <button
          id="stop-scanner-btn"
          onClick={stopScanner}
          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          ⏹ Stop Scanner
        </button>
      )}

      {isActive && (
        <div className="text-xs text-muted-foreground text-center bg-muted/50 py-2 rounded px-2">
          📸 Camera is live — hold a QR code in front to scan
        </div>
      )}

      {/* Live video feed */}
      <video
        ref={videoRef}
        className={`w-full rounded-lg border-2 border-border bg-black ${isActive ? 'block' : 'hidden'}`}
        style={{
          minHeight: isActive ? '500px' : '0px',
          maxHeight: '600px',
          objectFit: 'cover'
        }}
      />

      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
