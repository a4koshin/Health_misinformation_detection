"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { MaterialIcon } from "@/components/ui/material-icon";

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      {/* Main analysis card */}
      <div className="glass-strong relative rounded-3xl p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#ff5c00] text-white">
            <MaterialIcon name="neurology" size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">
              Claim analysis
            </p>
            <p className="text-xs text-[#64748b]">Somali health claim</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm leading-relaxed text-[#0f172a]">
              &ldquo;Cabitaanka liinta ayaa daaweeya wadne xanuunka…&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-red-500/15 text-red-600">
              <MaterialIcon name="report" size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                Misinformation
              </p>
              <p className="text-xs text-[#64748b]">
                Classified by the trained SVM model
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["TF-IDF", "Vectorized"],
            ["SVM", "Predicted"],
            ["Label", "Decoded"],
          ].map(([step, state]) => (
            <div key={step} className="rounded-xl bg-gray-100 px-3 py-2.5 text-center">
              <p className="text-xs font-semibold text-[#cc4a00]">{step}</p>
              <p className="text-[10px] text-[#64748b]">{state}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating accent panels */}
      <div className="glass animate-float absolute -top-6 -right-4 hidden rounded-2xl px-4 py-3 sm:block">
        <div className="flex items-center gap-2">
          <MaterialIcon name="verified" size={18} className="text-emerald-600" />
          <span className="text-xs font-medium text-[#0f172a]">
            Reliable claim detected
          </span>
        </div>
      </div>
      <div className="glass animate-float-slow absolute -bottom-6 -left-4 hidden rounded-2xl px-4 py-3 sm:block">
        <div className="flex items-center gap-2">
          <MaterialIcon name="language" size={18} className="text-[#ff5c00]" />
          <span className="text-xs font-medium text-[#0f172a]">
            Somali language aware
          </span>
        </div>
      </div>
    </div>
  );
}

export function GlassHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:py-16">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          transition={{ staggerChildren: 0.12 }}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.7 }}>
            <GlassBadge>AI-powered misinformation detection</GlassBadge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="mt-6 text-4xl leading-[1.1] font-normal tracking-tight text-[#0f172a] sm:text-5xl lg:text-6xl"
          >
            Truth you can trust in{" "}
            <span className="text-gradient-brand animate-gradient-x">
              Somali health
            </span>{" "}
            information
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-[#475569] sm:text-lg"
          >
            HealthAI instantly analyzes Somali health claims with a trained
            machine learning model, separating reliable guidance from harmful
            misinformation — so your community stays safely informed.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <GlassButton asChild size="lg">
              <Link href="/register">
                Start checking claims
                <MaterialIcon name="arrow_forward" size={20} />
              </Link>
            </GlassButton>
            <GlassButton asChild variant="glass" size="lg">
              <Link href="/how-it-works">See how it works</Link>
            </GlassButton>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="mt-8 flex items-center gap-2 text-sm text-[#64748b]"
          >
            <MaterialIcon name="lock" size={16} className="text-[#ff5c00]" />
            Free for students and researchers — no credit card required
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
