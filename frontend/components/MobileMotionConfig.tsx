"use client"

import { MotionConfig } from "framer-motion"
import { useEffect, useState } from "react"

interface MobileMotionConfigProps {
    children: React.ReactNode
}

export function MobileMotionConfig({ children }: MobileMotionConfigProps) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        // Checar inicialmente
        checkMobile()

        // Adicionar listener
        window.addEventListener("resize", checkMobile)

        // Limpar listener
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    return (
        <MotionConfig reducedMotion={isMobile ? "always" : "user"}>
            {children}
        </MotionConfig>
    )
}
