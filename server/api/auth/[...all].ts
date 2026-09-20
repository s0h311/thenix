import { defineEventHandler } from 'nitro/h3'
import { auth } from '../../infrastructure/Auth/auth'

export default defineEventHandler((event) => {
  return auth.handler(event.req)
})
