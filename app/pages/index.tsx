import { createFileRoute, Link } from '@tanstack/react-router'
import { Mark } from '../components/Brand/Mark.tsx'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Mark />
        <h1 className='text-2xl font-semibold'>Training log</h1>
      </div>
      <Link
        to='/import'
        className='inline-block rounded-md bg-brand px-3 py-2 font-semibold text-white'
      >
        Import a Week
      </Link>
    </div>
  )
}
