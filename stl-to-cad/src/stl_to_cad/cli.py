"""
STL to CAD CLI
"""

import sys
from pathlib import Path

import click

from .core import STLToCADConverter
from .config import ConversionConfig


@click.command()
@click.argument("input_stl", type=click.Path(exists=True))
@click.argument("output_kcl", type=click.Path(), required=False)
@click.option("--info", "-i", is_flag=True, help="Show mesh info only")
def main(input_stl: str, output_kcl: str, info: bool):
    """Convert STL mesh to KCL parametric code."""
    
    config = ConversionConfig()
    converter = STLToCADConverter(config)
    
    click.echo(f"Loading: {input_stl}")
    converter.load(input_stl)
    
    mesh_info = converter.get_mesh_info()
    click.echo(f"  Name: {mesh_info['name']}")
    click.echo(f"  Vertices: {mesh_info['num_vertices']}")
    click.echo(f"  Faces: {mesh_info['num_faces']}")
    click.echo(f"  Size: {mesh_info['size']}")
    
    if info:
        return
    
    if output_kcl is None:
        output_kcl = Path(input_stl).with_suffix(".kcl")
    
    click.echo(f"\nConverting to: {output_kcl}")
    converter.export_kcl(output_kcl)
    click.echo("✅ Done!")


if __name__ == "__main__":
    main()
