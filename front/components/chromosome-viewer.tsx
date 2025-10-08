"use client"

import { useEffect, useState } from 'react';
import { getAssembledMolecules } from '@/lib/api/assemblies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface AssembledMolecule {
  chr_name: string;
  length: number;
  genbank_accession?: string;
  refseq_accession?: string;
  sequence_name?: string;
  aliases: string[];
}

interface ChromosomeInterface {
  accession_version: string;
  chr_name: string;
  length: number;
  aliases: string[];
}

interface ChromosomeViewerProps {
  accession: string;
  selectedChromosomes?: ChromosomeInterface[];
  onChromosomeSelected?: (chromosome: ChromosomeInterface) => void;
}

export function ChromosomeViewer({
  accession,
  onChromosomeSelected,
}: ChromosomeViewerProps) {

  const [chromosomes, setChromosomes] = useState<ChromosomeInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChromosome, setSelectedChromosome] = useState<ChromosomeInterface | null>(null);

  const svgHeight = 120; // Fixed height for chromosomes

  // Fetch chromosomes from API
  useEffect(() => {
    const fetchChromosomes = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all assembled molecules (no pagination limit)
        const response = await getAssembledMolecules(accession, 0, 1000);

        // Map API response to chromosome format
        const mappedChromosomes: ChromosomeInterface[] = response.results.map((molecule: AssembledMolecule) => ({
          accession_version: molecule.refseq_accession || molecule.genbank_accession || molecule.sequence_name || '',
          chr_name: molecule.chr_name || molecule.sequence_name || '',
          length: molecule.length || 0,
          aliases: molecule.aliases || [],
        }));

        // Sort by chromosome name (natural sort for chr1, chr2, chr10, etc.)
        mappedChromosomes.sort((a, b) => {
          const aNum = parseInt(a.chr_name.replace(/\D/g, ''));
          const bNum = parseInt(b.chr_name.replace(/\D/g, ''));
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.chr_name.localeCompare(b.chr_name);
        });

        setChromosomes(mappedChromosomes);
      } catch (err) {
        console.error('Error fetching chromosomes:', err);
        setError('Failed to load chromosomes');
      } finally {
        setLoading(false);
      }
    };

    if (accession) {
      fetchChromosomes();
    }
  }, [accession]);

  const formatLength = (length: number) => {
    if (length >= 1_000_000) {
      return `${(length / 1_000_000).toFixed(1)}M`
    }
    return `${(length / 1_000).toFixed(0)}k`
  }

  const handleChromosomeClick = (chromosome: ChromosomeInterface) => {
    setSelectedChromosome(chromosome);
    //if chr is already selected, deselect it
    if (selectedChromosome?.chr_name === chromosome.chr_name) {
      setSelectedChromosome(null);
    }
    if (onChromosomeSelected) {
      onChromosomeSelected(chromosome);
    }
  };


  const MAX_HEIGHT = 120 // Maximum height in pixels for the longest chromosome
  const maxLength = chromosomes.reduce((max, c) => Math.max(max, c.length), 0);
  if (loading) {
    return (
      <div className="chromosome-viewer flex items-center justify-center" style={{ height: svgHeight }}>
        <div className="text-sm text-muted-foreground">Loading chromosomes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chromosome-viewer flex items-center justify-center" style={{ height: svgHeight }}>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (chromosomes.length === 0) {
    return (
      <div className="chromosome-viewer flex items-center justify-center" style={{ height: svgHeight }}>
        <div className="text-sm text-muted-foreground">No chromosomes found</div>
      </div>
    );
  }

  const displayedChromosome = selectedChromosome;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-center gap-2">
        {chromosomes.map((chr) => {
          const height = Math.max((chr.length / maxLength) * MAX_HEIGHT, 20) // Minimum 20px for visibility
          const isSelected = selectedChromosome?.chr_name === chr.chr_name;

          return (
            <div
              key={chr.chr_name}
              className="flex flex-col items-center gap-1 group cursor-pointer"
              title={`${chr.chr_name}: ${formatLength(chr.length)}bp`}
              onClick={() => handleChromosomeClick(chr)}
            >
              {/* Chromosome bar (vertical) */}
              <div
                className={`relative w-4 rounded-t transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                style={{
                  height: `${height}px`,
                  backgroundColor: 'var(--primary)',
                  opacity: isSelected ? 1 : 0.8,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              {/* Chromosome label */}
              <span className={`text-xs font-mono ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {chr.chr_name}
              </span>
              {/* Length (shown on hover) */}
              <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {formatLength(chr.length)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Chromosome details card */}
      {displayedChromosome && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chromosome Details</CardTitle>
              {/* close button */}
              <Button variant="ghost" size="icon" onClick={() => setSelectedChromosome(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Chromosome Name</div>
                <div className="text-base font-mono font-semibold">{displayedChromosome.chr_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Accession Version</div>
                <div className="text-base font-mono">{displayedChromosome.accession_version || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Length</div>
                <div className="text-base font-semibold">{displayedChromosome.length.toLocaleString()} bp</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Aliases</div>
                <div className="text-base font-mono">{displayedChromosome.aliases.join(', ')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// CSS Module styles (add to your globals.css or component styles)
// .chromosome-viewer {
//   position: relative;
//   display: block;
//   width: 100%;
// }

// .scrollable-svg {
//   overflow-x: auto;
//   overflow-y: hidden;
//   white-space: nowrap;
// }

// .scrollable-svg svg {
//   display: block;
// }
