import { useState, type ImgHTMLAttributes } from 'react'
import { thumbnailUrl } from '../lib/api'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { fileId: string; width?: number }

export default function DriveImage({ fileId, width = 400, ...props }: Props) {
  return <ImageSource key={`${fileId}:${width}`} fileId={fileId} width={width} {...props} />
}

function ImageSource({ fileId, width = 400, alt = '', ...props }: Props) {
  const [attempt, setAttempt] = useState(0)
  const sources = [thumbnailUrl(fileId, width), `https://lh3.googleusercontent.com/d/${fileId}=w${width}`]
  if (attempt >= sources.length) {
    return <span className={`drive-image-error ${props.className ?? ''}`} role="img" aria-label={alt || '사진을 불러오지 못했습니다'} title="Drive에서 사진의 공유 권한과 위치를 확인해 주세요">사진 확인 필요</span>
  }
  return <img {...props} src={sources[attempt]} alt={alt} referrerPolicy="no-referrer" onError={() => setAttempt((value) => value + 1)} />
}
