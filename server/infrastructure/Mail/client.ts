import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { HtmlMailData, MailData } from './types.ts'
import { getEnvVariableOrThrow } from '../Utils/getEnvVariable.ts'

const from = `"${getEnvVariableOrThrow('MAIL_FROM_NAME')}" <${getEnvVariableOrThrow('MAIL_FROM_ADDRESS')}>`

const transport = nodemailer.createTransport({
  host: getEnvVariableOrThrow('MAIL_SMTP_HOST'),
  port: 587,
  secure: false,
  auth: {
    user: getEnvVariableOrThrow('MAIL_SMTP_USER'),
    pass: getEnvVariableOrThrow('MAIL_SMTP_PASSWORD'),
  },
})

export function sendMail({
  recipients,
  subject,
  text,
  attachments = [],
}: MailData): Promise<SMTPTransport.SentMessageInfo> {
  const mappedAttachments = attachments.map((attachment) => ({ ...attachment, filename: attachment.fileName }))

  return transport.sendMail({
    from,
    to: recipients.join(', '),
    subject,
    text,
    attachments: mappedAttachments,
  })
}

export function sendMailWithHtml({
  recipients,
  subject,
  html,
  attachments = [],
}: HtmlMailData): Promise<SMTPTransport.SentMessageInfo> {
  const mappedAttachments = attachments.map((attachment) => ({ ...attachment, filename: attachment.fileName }))

  return transport.sendMail({
    from,
    to: recipients.join(', '),
    subject,
    html,
    attachments: mappedAttachments,
  })
}
