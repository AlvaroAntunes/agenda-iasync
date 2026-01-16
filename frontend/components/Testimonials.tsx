"use client";

import { Marquee } from "@/components/magicui/marquee"
import Image from "next/image"

const testimonials = [
  {
    name: "Dr. Ricardo Santos",
    body: "Reduzi 60% das faltas desde que comecei aquiri o sistema da IASync. A minha recepcionista agora foca no que realmente importa.",
    img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Dr. Miguel Ferreira",
    body: "Implementámos em 3 unidades e o retorno foi imediato. Mais consultas, menos trabalho administrativo.",
    img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Dra. Carla Mendes",
    body: "Finalmente uma solução que entende as necessidades reais de uma clínica. Simples e eficaz.",
    img: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Dra. Sofia Costa",
    body: "Pais ocupados conseguem marcar consultas às 23h. Isso faz toda a diferença na fidelização.",
    img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Dr. André Silva",
    body: "O suporte é excelente e a integração com o Google Calendar foi perfeita. Recomendo a 100%.",
    img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Dra. Inês Almeida",
    body: "Em 2 meses recuperei o investimento anual. A eficiência que ganhámos não tem preço.",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
  },
]

const firstColumn = testimonials.slice(0, 3)
const secondColumn = testimonials.slice(3, 6)
const thirdColumn = testimonials.slice(6, 9)

const TestimonialCard = ({
  img,
  name,
  body,
}: {
  img: string
  name: string
  body: string
}) => {
  return (
    <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50">
      <div className="text-foreground/90 leading-relaxed text-sm">{body}</div>

      <div className="mt-5 flex items-center gap-3">
        <Image
          src={img || "/placeholder.svg"}
          alt={name}
          height={44}
          width={44}
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <div className="font-semibold text-foreground">{name}</div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-gradient-to-b from-cyan-50 via-sky-50 to-cyan-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-xl text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 
                           rounded-full px-4 py-2 mb-6 border-blue-600/30">
              <span className="text-sm text-blue-700 font-medium">
                Testemunhos
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            O que dizem
            <span className="text-gradient"> os profissionais de saúde</span>
          </h2>
        </div>

        <div className="flex max-h-[600px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
          <div>
            <Marquee pauseOnHover vertical className="[--duration:25s]">
              {firstColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </Marquee>
          </div>

          <div className="hidden md:block">
            <Marquee reverse pauseOnHover vertical className="[--duration:30s]">
              {secondColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </Marquee>
          </div>

          <div className="hidden lg:block">
            <Marquee pauseOnHover vertical className="[--duration:35s]">
              {thirdColumn.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </section>
  )
}
