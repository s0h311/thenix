import { db } from '../../infrastructure/Database/client.ts'
import { createTraining } from './createTraining.ts'

export const training = createTraining({ database: db })
