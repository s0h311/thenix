export type MailAttachment = {
  fileName: string
  content: string
  contentType?: string
}

export type MailData = {
  recipients: string[]
  subject: string
  text: string
  attachments?: MailAttachment[]
}

export type HtmlMailData = {
  recipients: string[]
  subject: string
  html: string
  attachments?: MailAttachment[]
}

export type MailSender = (data: HtmlMailData) => Promise<unknown>
