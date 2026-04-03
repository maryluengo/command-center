import { useRef, useState } from 'react'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function FileUpload({ files = [], onChange, accept = '*', label = 'Upload files' }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const processFiles = async (rawFiles) => {
    const results = []
    for (const file of rawFiles) {
      if (file.size > 3 * 1024 * 1024) {
        alert(`"${file.name}" is over 3MB — please use a smaller file.`)
        continue
      }
      const data = await readAsDataURL(file)
      results.push({ id: genId(), name: file.name, type: file.type, data })
    }
    onChange([...files, ...results])
  }

  const readAsDataURL = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    })

  const handleInput = (e) => processFiles(Array.from(e.target.files))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  const remove = (id) => onChange(files.filter(f => f.id !== id))

  return (
    <div>
      <div
        className={`file-drop-zone ${dragging ? 'drag-over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span>📎</span> {label} <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>(max 3MB each)</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleInput}
      />

      {files.length > 0 && (
        <div className="file-previews">
          {files.map(f => (
            <FileThumb key={f.id} file={f} onRemove={() => remove(f.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FileThumb({ file, onRemove }) {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage) {
    return (
      <div className="file-thumb">
        <img src={file.data} alt={file.name} />
        <button className="file-thumb-remove" onClick={onRemove} title="Remove">×</button>
      </div>
    )
  }

  if (isVideo) {
    return (
      <div className="file-thumb">
        <video src={file.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <button className="file-thumb-remove" onClick={onRemove} title="Remove">×</button>
      </div>
    )
  }

  return (
    <div className="file-thumb-doc" style={{ position: 'relative' }}>
      <span style={{ fontSize: '22px' }}>📄</span>
      <span>{file.name.length > 14 ? file.name.slice(0, 14) + '…' : file.name}</span>
      <button className="file-thumb-remove" onClick={onRemove} title="Remove" style={{ opacity: 1, position: 'absolute', top: 3, right: 3 }}>×</button>
    </div>
  )
}
