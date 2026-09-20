import { createFileRoute } from '@tanstack/react-router'
import { Mark } from '../components/Brand/Mark.tsx'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className='flex items-center gap-3'>
      <Mark />
      <h1 className='text-2xl font-semibold'>Training log</h1>
    </div>
  )
}
