"use client"

import CardSwap, { Card } from "./card-swap"
import { Database, Download, Zap, Globe, TextSearch, ChartBar } from "lucide-react"

export function Hero() {
    return (
        <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-[#100818]">
            <div className="container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-[50%_50%] gap-12 items-center">
                    {/* left side - Content */}
                    <div className="space-y-8 flex flex-col justify-center">
                        <div>
                            <h1 className="text-6xl font-semibold text-white mb-6 leading-tight">
                                Genome annotations in one place
                            </h1>
                            <p className="text-2xl text-gray-300 leading-relaxed">
                                Stream GFF files, download annotation packages, and explore eukaryotic genomes from NCBI and Ensembl
                            </p>
                        </div>
                    </div>

                    {/* right side - CardSwap */}
                    <div className="relative h-[500px] hidden lg:flex lg:items-center lg:justify-center">
                        <CardSwap
                            width={400}
                            height={300}
                            cardDistance={40}
                            verticalDistance={50}
                            delay={3000}
                            pauseOnHover={false}
                            easing="linear"
                        >
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Globe className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Discover</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Annotations by taxonomy, genome assembly and species
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Download className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Download</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Custom annotation subsets
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <ChartBar className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Explore</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Statistics for selected datasets
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm relative overflow-hidden">
                                <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <TextSearch className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Visualize</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Annotations on the JBrowse2 genome browser
                                    </p>
                                </div>
                            </Card>
                            <Card className="bg-black/50 border-gray-700 backdrop-blur-sm">
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                                    <div className="w-12 h-12 mb-4 flex items-center justify-center">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Stream</h3>
                                    <p className="text-sm text-gray-300 text-center">
                                        Specific features dynamically 
                                    </p>
                                </div>
                            </Card>
                        </CardSwap>
                    </div>
                </div>
            </div>
        </div>
    )
}

