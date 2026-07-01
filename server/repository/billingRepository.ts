// server/repository/billingRepository.ts
import { Prisma } from '../../prisma/generated/client' 
import { prisma } from '../utils/db' // server/utils/db.ts এর আপেক্ষিক পাথ অনুযায়ী [1.1]

export const billingRepository = {
  /**
   * ১. ইউজার ডিপোজিট রিকোয়েস্ট তৈরি করা (ট্রানজেকশন আইডি ইউনিক ভ্যালিডেশন সহ)
   */
  async createPendingDeposit(
    orgId: string,
    data: {
      method: 'BKASH' | 'NAGAD' | 'ROCKET'
      senderNumber: string
      transactionId: string
      amount: number
    }
  ) {
    try {
      return await prisma.manualDeposit.create({
        data: {
          method: data.method,
          senderNumber: data.senderNumber,
          transactionId: data.transactionId.trim().toUpperCase(),
          amount: data.amount,
          status: 'PENDING',
          organizationId: orgId
        }
      })
    } catch (error: any) {
      // Prisma-র P2002 এরর দিয়ে ডুপ্লিকেট ট্রানজেকশন আইডি আটকানো
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Conflict: This Transaction ID has already been submitted'
        })
      }
      throw error
    }
  },

  /**
   * ২. নির্দিষ্ট অর্গানাইজেশনের সমস্ত পেমেন্ট হিস্ট্রি রিড করা
   */
  async getDepositHistory(orgId: string) {
    return await prisma.manualDeposit.findMany({
      where: {
        organizationId: orgId
      },
      orderBy: {
        createdAt: 'desc' // সর্বশেষ ট্রানজেকশনটি ওপরে দেখাবে
      }
    })
  },

  /**
   * ৩. এডমিন রিভিউর জন্য সমস্ত PENDING ডিপোজিট কুয়েরি করা (অর্গানাইজেশনের নাম সহ)
   */
  async getAdminPendingDeposits() {
    return await prisma.manualDeposit.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        // এডমিন যেন ড্যাশবোর্ডে কোন বিজনেসের ট্রানজেকশন তা দেখতে পারেন [1]
        organization: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // পুরোনো রিকোয়েস্টগুলো আগে দেখাবে যাতে এডমিন সিরিয়ালি প্রসেস করতে পারেন
      }
    })
  },

  /**
   * ৪. ট্রানজেকশনের মাধ্যমে পেমেন্ট এপ্রুভ করা এবং ব্যালেন্স-ক্রেডিট আপডেট করা (Prisma Transaction) [1.1]
   */
  async approveDeposit(depositId: string) {
    return await prisma.$transaction(async (tx) => {
      // ক. পেন্ডিং ডিপোজিট রেকর্ডটি ডাটাবেস থেকে রিড করা
      const deposit = await tx.manualDeposit.findUnique({
        where: { id: depositId }
      })

      if (!deposit) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Not Found: Manual deposit record not found'
        })
      }

      // যদি ট্রানজেকশনটি ইতিমধ্যেই প্রসেসড হয়ে থাকে
      if (deposit.status !== 'PENDING') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request: This deposit has already been processed'
        })
      }

      // খ. ডিপোজিট স্ট্যাটাস 'APPROVED' এ আপডেট করা
      const updatedDeposit = await tx.manualDeposit.update({
        where: { id: depositId },
        data: {
          status: 'APPROVED'
        }
      })

      // গ. সংশ্লিষ্ট অর্গানাইজেশনের ওয়ালেট ব্যালেন্স ও মেমরি ক্রেডিট এটোমিকালি আপডেট করা [1.1]
      const amountAsNumber = Number(deposit.amount)

      await tx.organization.update({
        where: { id: deposit.organizationId },
        data: {
          // ওয়ালেট ব্যালেন্স যোগ করা হচ্ছে [1.1]
          walletBalance: {
            increment: deposit.amount
          },
          // স্থায়ী ক্রেডিট যোগ করা হচ্ছে (অনুপাত ১ BDT = ১ Credit) [1.1]
          permanentCredit: {
            increment: Math.floor(amountAsNumber)
          }
        }
      })

      return updatedDeposit
    })
  },

  /**
   * ৫. পেমেন্ট রিকোয়েস্ট রিজেক্ট করা
   */
  async rejectDeposit(depositId: string) {
    const deposit = await prisma.manualDeposit.findUnique({
      where: { id: depositId }
    })

    if (!deposit) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Manual deposit record not found'
      })
    }

    if (deposit.status !== 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: This deposit has already been processed'
      })
    }

    return await prisma.manualDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REJECTED'
      }
    })
  }
}