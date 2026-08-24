import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log("Email not configured — skipping send to", to);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"ADTECH Work Orders" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Never let an email failure break the actual work order update
    console.error("Failed to send email:", err);
  }
}

const APP_URL = process.env.NEXTAUTH_URL || "";

export function workOrderAssignedEmail(title: string, workOrderId: string) {
  return {
    subject: `You've been assigned: ${title}`,
    html: `<p>You've been assigned to a work order:</p><p><strong>${title}</strong></p><p><a href="${APP_URL}/work-orders/${workOrderId}">View work order</a></p>`,
  };
}

export function statusChangedEmail(title: string, status: string, workOrderId: string) {
  return {
    subject: `Status update: ${title}`,
    html: `<p>The status of a work order changed to <strong>${status.replace("_", " ")}</strong>:</p><p><strong>${title}</strong></p><p><a href="${APP_URL}/work-orders/${workOrderId}">View work order</a></p>`,
  };
}


export function newCommentEmail(title: string, author: string, body: string, workOrderId: string) {
  return {
    subject: `New update on: ${title}`,
    html: `<p><strong>${author}</strong> commented on a work order:</p><p><strong>${title}</strong></p><p>"${body}"</p><p><a href="${APP_URL}/work-orders/${workOrderId}">View work order</a></p>`,
  };
}

export function newRegistrationEmail(name: string, email: string) {
  return {
    subject: `New account registration: ${name}`,
    html: `<p><strong>${name}</strong> (${email}) has registered for an account and is waiting for approval.</p><p><a href="${APP_URL}/users">Review and assign a role</a></p>`,
  };
}


export function serviceRequestAssignedEmail(title: string, serviceRequestId: string) {
  return {
    subject: `You've been assigned: ${title}`,
    html: `<p>You've been assigned to a service request:</p><p><strong>${title}</strong></p><p><a href="${APP_URL}/service-requests/${serviceRequestId}">View service request</a></p>`,
  };
}

export function serviceRequestStatusChangedEmail(title: string, status: string, serviceRequestId: string) {
  return {
    subject: `Stage update: ${title}`,
    html: `<p>A service request moved to <strong>${status}</strong>:</p><p><strong>${title}</strong></p><p><a href="${APP_URL}/service-requests/${serviceRequestId}">View service request</a></p>`,
  };
}

export function serviceRequestNewCommentEmail(title: string, author: string, body: string, serviceRequestId: string) {
  return {
    subject: `New update on: ${title}`,
    html: `<p><strong>${author}</strong> commented on a service request:</p><p><strong>${title}</strong></p><p>"${body}"</p><p><a href="${APP_URL}/service-requests/${serviceRequestId}">View service request</a></p>`,
  };
}