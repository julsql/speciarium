from main.core.load_data.add_data import add_data
from main.core.load_data.get_data import get_dataset_on_each_image

if __name__ == "__main__":
    info = get_dataset_on_each_image()
    add_data(info)
