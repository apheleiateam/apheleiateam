// The Apheleia mark — a rounded "A" whose crossbar is a rising swoosh.
// Traced from the master artwork; coordinates are in the artwork's pixel space.

export const LOGO_VIEWBOX = [500, 290, 535, 442] // x, y, width, height
export const LOGO_LIME = '#BCFA03'

export const LOGO_PATHS = [
  // apex + left leg, cut by the swoosh
  'M725 318 C740 292 792 292 807 318 L913 499 C875 493 790 503 731 528 C680 548 555 655 530 727 C518 724 502 708 511 688 Z',
  // swoosh + right leg with the inner arch
  'M645 727 C663 658 758 547 921 515 L1022 682 C1034 700 1024 727 1000 727 L902 727 C890 727 882 722 876 713 L822 628 C808 611 780 612 762 626 C722 650 668 690 645 727 Z',
]
